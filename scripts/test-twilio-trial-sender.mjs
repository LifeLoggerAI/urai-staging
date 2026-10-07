import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTrialSender } from './verify-twilio-trial-sender.mjs';

const identity = { accountSid: 'AC' + 'a'.repeat(32), apiKeySid: 'SK' + 'b'.repeat(32),
  apiKeySecret: 'synthetic-secret', fromNumber: '+15555550100' };
const owned = { account_sid: identity.accountSid, phone_number: identity.fromNumber, capabilities: { sms: true } };
const response = (numbers = [owned], extra = {}) => new Response(JSON.stringify({ incoming_phone_numbers: numbers, ...extra }), { status: 200 });

test('trial sender verifies exact account and number through one bounded read-only provider request', async () => {
  let calls = 0;
  const receipt = await verifyTrialSender({ ...identity, fetchImpl: async (input, init) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.origin, 'https://api.twilio.com');
    assert.equal(url.pathname, `/2010-04-01/Accounts/${identity.accountSid}/IncomingPhoneNumbers.json`);
    assert.equal(url.searchParams.get('PhoneNumber'), identity.fromNumber);
    assert.equal(url.searchParams.get('PageSize'), '2');
    assert.equal(init.method, 'GET');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.authorization, `Basic ${Buffer.from(identity.apiKeySid + ':' + identity.apiKeySecret).toString('base64')}`);
    return response();
  } });
  assert.equal(calls, 1);
  assert.equal(receipt.smsCapable, true);
  assert.equal(receipt.deliveryAuthorizedByThisReceipt, false);
  assert.ok(!JSON.stringify(receipt).includes(identity.fromNumber));
  assert.ok(!JSON.stringify(receipt).includes(identity.apiKeySecret));
});

test('missing or malformed sender and credential identities fail before provider access', async () => {
  for (const invalid of [{ fromNumber: '' }, { fromNumber: '15555550100' }, { fromNumber: '+15555550100\nINJECT=true' }, { accountSid: 'other' }, { apiKeySid: '' }, { apiKeySecret: '' }]) {
    let called = false;
    await assert.rejects(verifyTrialSender({ ...identity, ...invalid, fetchImpl: async () => { called = true; return response(); } }));
    assert.equal(called, false);
  }
});

test('missing, ambiguous, cross-account, mismatched, non-SMS, and incomplete ownership records fail closed', async () => {
  for (const r of [response([]), response([owned, owned]), response([{ ...owned, account_sid: 'AC' + 'c'.repeat(32) }]),
    response([{ ...owned, phone_number: '+15555550101' }]), response([{ ...owned, capabilities: { sms: false } }]),
    response([owned], { next_page_uri: '/more' }), new Response('{}', { status: 200 })]) {
    await assert.rejects(verifyTrialSender({ ...identity, fetchImpl: async () => r }));
  }
});

test('provider denial and network failure never retry or authorize a delivery', async () => {
  for (const denied of [async () => new Response('{}', { status: 401 }), async () => { throw Error('unavailable'); }]) {
    let calls = 0;
    await assert.rejects(verifyTrialSender({ ...identity, fetchImpl: async () => { calls++; return denied(); } }));
    assert.equal(calls, 1);
  }
});
