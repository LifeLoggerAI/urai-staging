import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function verifyTrialSender({ accountSid, apiKeySid, apiKeySecret, fromNumber, fetchImpl = fetch }) {
  assert.match(accountSid || '', /^AC[0-9a-f]{32}$/, 'Invalid protected Twilio account identity');
  assert.match(apiKeySid || '', /^SK[0-9a-f]{32}$/, 'Invalid protected Twilio API-key identity');
  assert.ok(apiKeySecret, 'Missing protected Twilio API-key secret');
  assert.match(fromNumber || '', /^\+[1-9][0-9]{6,14}$/, 'Explicit owned trial sender must be E.164');
  const url = new URL(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`);
  url.searchParams.set('PhoneNumber', fromNumber);
  url.searchParams.set('PageSize', '2');
  const response = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: { authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}` },
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, 200, 'Protected Twilio sender ownership read failed');
  const body = await response.json();
  assert.ok(Array.isArray(body.incoming_phone_numbers), 'Missing Twilio sender ownership records');
  assert.equal(body.incoming_phone_numbers.length, 1, 'Trial sender must resolve to exactly one owned number');
  const sender = body.incoming_phone_numbers[0];
  assert.equal(sender.account_sid, accountSid, 'Trial sender belongs to another account');
  assert.equal(sender.phone_number, fromNumber, 'Trial sender identity mismatch');
  assert.equal(sender.capabilities?.sms, true, 'Trial sender must support SMS');
  assert.ok(!body.next_page_uri, 'Trial sender ownership result must be complete');
  return { schemaVersion: 'urai-twilio-trial-owned-sender-v1', senderMode: 'explicit-owned-trial-number',
    senderRef: crypto.createHash('sha256').update(fromNumber).digest('hex').slice(0, 16),
    accountRef: crypto.createHash('sha256').update(accountSid).digest('hex').slice(0, 16),
    smsCapable: true, providerReadOnly: true, deliveryAuthorizedByThisReceipt: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyTrialSender({ accountSid: process.env.TWILIO_ACCOUNT_SID, apiKeySid: process.env.TWILIO_API_KEY_SID,
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET, fromNumber: process.env.TWILIO_FROM_NUMBER })
    .then(result => console.log(JSON.stringify(result)))
    .catch(() => { console.error('[FAIL] Protected owned Twilio trial sender verification failed'); process.exitCode = 1; });
}
