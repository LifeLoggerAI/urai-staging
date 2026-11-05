import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { R722_PENDING, r722CanonicalBytes, verifyR722SyntheticDeletionReceipts } from './lib/r722-deletion-receipt-proof.mjs';

const original = readFileSync(new URL('./fixtures/r720-privacy/deletion-contract.ts', import.meta.url));
const blob = createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex');
test('R722 original Privacy #221 registry source and eight contributors remain pinned', () => {
  assert.equal(blob, '1a9ffd566bd6be8257b598a216cf254228971447');
  assert.equal(R722_PENDING.length, 8);
  for (const id of R722_PENDING) {
    const i = original.toString().indexOf('id: "' + id + '"');
    assert.ok(i >= 0, id + ' registered');
    assert.match(original.toString().slice(i, i+140), /status: "pending"/);
  }
});
const NOW = Date.parse('2026-11-05T17:00:00.000Z');
const context = Object.freeze({
  manifestVersion:'1.9.0',requestId:'synthetic-request-001',
  subjectHash:'a'.repeat(64),tenantScopeHash:'b'.repeat(64),
  generation:7,legalHold:false,environment:'offline-synthetic-only',productionAuthorized:false
});
const keys = Object.fromEntries(R722_PENDING.map((id,i)=>{
  const kp=generateKeyPairSync('ed25519');
  return [id,{keyId:'review-signer-'+String(i).padStart(3,'0'),
    publicKey:kp.publicKey.export({type:'spki',format:'pem'}).toString(),
    privateKey:kp.privateKey}];
}));
const trustedPublicKeys=Object.fromEntries(R722_PENDING.map(id=>[id,{
  keyId:keys[id].keyId,publicKey:keys[id].publicKey}]));
function receipt(adapterId,overrides={}) {
  const p={adapterId,requestId:context.requestId,subjectHash:context.subjectHash,
    generation:context.generation,tenantScopeHash:context.tenantScopeHash,
    disposition:'deleted',residualCount:0,revocationEnforced:true,postRevokeDenied:true,
    linkageScanComplete:true,providerAckId:'provider-ack-'+adapterId.padEnd(12,'x'),
    tenantAccessWithdrawn:adapterId==='ruai-b2bportal',
    centralAnalyticsRetracted:adapterId==='ruai-b2bportal',
    issuedAt:NOW-60000,expiresAt:NOW+60000,
    receiptId:'receipt-'+adapterId.padEnd(12,'x'),...overrides};
  return {payload:p,keyId:keys[adapterId].keyId,
    signature:sign(null,r722CanonicalBytes(p),keys[adapterId].privateKey).toString('base64url')};
}
const baseline=()=>R722_PENDING.map(id=>receipt(id));
const run=(receipts,ctx=context,registry=trustedPublicKeys)=>
  verifyR722SyntheticDeletionReceipts({context:ctx,receipts,trustedPublicKeys:registry,now:NOW});
function denied(reason,mutate) {
  test('R722 denies '+reason,()=>{
    const x=mutate(baseline());
    const r=run(x.receipts??x,x.context??context,x.registry??trustedPublicKeys);
    assert.equal(r.syntheticEvidenceValid,false);
    assert.equal(r.globalDeletionVerified,false);
    assert.equal(r.productionAuthorized,false);
    assert.equal(r.releaseHold,true);
    assert.ok(r.blockers.length>0);
  });
}
test('R722 eight independent signatures validate only synthetic evidence, never deletion',()=>{
  const r=run(baseline());
  assert.equal(r.syntheticEvidenceValid,true);
  assert.equal(r.globalDeletionVerified,false);
  assert.equal(r.productionAuthorized,false);
  assert.equal(r.releaseHold,true);
});
test('R722 independently scanned RuAi no-data attestation allows only synthetic proof',()=>{
  const r=baseline();
  r[7]=receipt('ruai-b2bportal',{disposition:'no-data',providerAckId:'',
    revocationEnforced:false,postRevokeDenied:false,
    tenantAccessWithdrawn:false,centralAnalyticsRetracted:false});
  assert.equal(run(r).syntheticEvidenceValid,true);
  assert.equal(run(r).globalDeletionVerified,false);
});
denied('missing contributor',r=>r.slice(1));
denied('duplicate contributor',r=>[r[0],...r.slice(0,-1)]);
denied('unknown contributor',r=>{r[0].payload.adapterId='unknown';return r;});
denied('forged payload',r=>{r[0].payload.subjectHash='c'.repeat(64);return r;});
denied('cross request',r=>{r[0]=receipt(R722_PENDING[0],{requestId:'other-request-id'});return r;});
denied('cross subject',r=>{r[0]=receipt(R722_PENDING[0],{subjectHash:'e'.repeat(64)});return r;});
denied('cross tenant',r=>{r[0]=receipt(R722_PENDING[0],{tenantScopeHash:'f'.repeat(64)});return r;});
denied('stale generation',r=>{r[0]=receipt(R722_PENDING[0],{generation:6});return r;});
denied('expired receipt',r=>{r[0]=receipt(R722_PENDING[0],{expiresAt:NOW-1});return r;});
denied('future receipt',r=>{r[0]=receipt(R722_PENDING[0],{issuedAt:NOW+200000,expiresAt:NOW+300000});return r;});
denied('missing post revoke 403',r=>{r[0]=receipt(R722_PENDING[0],{postRevokeDenied:false});return r;});
denied('missing provider ACK',r=>{r[0]=receipt(R722_PENDING[0],{providerAckId:''});return r;});
denied('residual data',r=>{r[0]=receipt(R722_PENDING[0],{residualCount:1});return r;});
denied('RuAi tenant withdrawal missing',r=>{r[7]=receipt('ruai-b2bportal',{tenantAccessWithdrawn:false});return r;});
denied('RuAi analytics retraction missing',r=>{r[7]=receipt('ruai-b2bportal',{centralAnalyticsRetracted:false});return r;});
denied('no-data without linkage scan',r=>{r[7]=receipt('ruai-b2bportal',{
  disposition:'no-data',providerAckId:'',revocationEnforced:false,postRevokeDenied:false,
  tenantAccessWithdrawn:false,centralAnalyticsRetracted:false,linkageScanComplete:false});return r;});
denied('wrong key',r=>{r[0].signature=sign(null,r722CanonicalBytes(r[0].payload),
  keys[R722_PENDING[1]].privateKey).toString('base64url');return r;});
denied('forged signer ID',r=>{r[0].keyId='impostor-identity';return r;});
denied('replayed receipt ID',r=>{r[1]=receipt(R722_PENDING[1],{receiptId:r[0].payload.receiptId});return r;});
denied('missing trust entry',r=>({receipts:r,registry:Object.fromEntries(Object.entries(trustedPublicKeys).slice(1))}));
denied('shared service key',r=>({receipts:r,registry:{
  ...trustedPublicKeys,[R722_PENDING[1]]:{...trustedPublicKeys[R722_PENDING[1]],
    publicKey:trustedPublicKeys[R722_PENDING[0]].publicKey}}}));
denied('legal hold',r=>({receipts:r,context:{...context,legalHold:true}}));
denied('production-authorized context',r=>({receipts:r,context:{...context,productionAuthorized:true}}));
denied('unsigned extra receipt field',r=>{r[0].payload.extra='not-signed';return r;});

denied('two different Ed25519 service keys with the same signer ID',r=>({
  receipts:r,
  registry:{
    ...trustedPublicKeys,
    [R722_PENDING[1]]:{
      ...trustedPublicKeys[R722_PENDING[1]],
      keyId:trustedPublicKeys[R722_PENDING[0]].keyId
    }
  }
}));
denied('unsigned top-level production approval alongside valid signature',r=>{
  r[0].productionAuthorized=true;
  return r;
});
denied('unsigned top-level provider deletion acknowledgment',r=>{
  r[0].providerDeletionAcknowledged=true;
  return r;
});
denied('receipt wrapper missing its signature field',r=>{
  delete r[0].signature;
  return r;
});
test('R724 unique key IDs and strict envelope shape report explicit blockers',()=>{
  const sharedRegistry={
    ...trustedPublicKeys,
    [R722_PENDING[1]]:{
      ...trustedPublicKeys[R722_PENDING[1]],
      keyId:trustedPublicKeys[R722_PENDING[0]].keyId
    }
  };
  assert.ok(run(baseline(),context,sharedRegistry).blockers.includes(
    'TRUSTED_KEY_INVALID_OR_SHARED'));
  const forged=baseline();
  forged[0].productionAuthorized=true;
  assert.ok(run(forged).blockers.includes('SIGNED_ENVELOPE_INVALID'));
});
