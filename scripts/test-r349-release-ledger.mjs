#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const path = new URL('../docs/release-evidence/r349-20261102-system-of-systems.json',import.meta.url);
const expectedGates = [
 '19-main-refs-observed','spatial-exact-head-source-suite','privacy-current-head-original-suite',
 'privacy-current-head-firebase-emulators','jobs-233-media-suite','studio-178-source-suite',
 'current-head-hosted-ci','trusted-private-consent-issuer','jobs-privacy-studio-runtime',
 'original-spatial-native-webgl','protected-staging-rollback','accessibility-performance-i18n-xr',
 'store-stripe-provider-readiness','genesis-native-film','independent-non-author-review',
 'founder-production-authorization'
];
const expectedCandidates = new Map([['urai-spatial',1949],['urai-privacy',183],['urai-jobs',233],['urai-studio',178],['urai-staging',118]]);
const sha40 = /^[0-9a-f]{40}$/;
const statuses = new Set(['PASS','FAIL','BLOCKED','NOT RUN']);
const load = () => JSON.parse(readFileSync(path,'utf8'));

function verify(snapshot) {
 assert.equal(snapshot.schemaVersion,'urai.genesis.release-evidence-snapshot.v1');
 assert.equal(snapshot.observedOn,'2026-11-02');
 assert.equal(snapshot.wave,'R349');
 assert.equal(snapshot.authoritativeTracker,'LifeLoggerAI/urai-staging#116');
 assert.match(snapshot.classification,/NONRELEASE/);
 assert.equal(snapshot.releaseVerdict,'NO-GO');
 assert.equal(snapshot.repositories.length,19);
 const names = new Set(snapshot.repositories.map(x=>x.name));
 assert.equal(names.size,19);
 for (const repo of snapshot.repositories) {
  assert.match(repo.mainSha,sha40);
  assert.equal(repo.releaseCandidateAccepted,false);
  assert.match(repo.source,/authenticated GitHub main branch/);
 }
 assert.equal(snapshot.openDraftCandidates.length,expectedCandidates.size);
 for (const pr of snapshot.openDraftCandidates) {
  assert.equal(expectedCandidates.get(pr.repository),pr.prNumber);
  assert.ok(names.has(pr.repository));
  assert.match(pr.observedHeadSha,sha40);
  assert.equal(pr.draft,true);
  assert.equal(pr.merged,false);
 }
 assert.equal(new Set(snapshot.openDraftCandidates.map(x=>x.repository)).size,expectedCandidates.size);
 assert.equal(snapshot.observedHostedRuns.length,expectedCandidates.size);
 for (const run of snapshot.observedHostedRuns) {
  const p = snapshot.openDraftCandidates.find(x=>x.repository===run.repository);
  assert.ok(p);
  assert.equal(run.prNumber,p.prNumber);
  assert.equal(run.sha,p.observedHeadSha);
  assert.equal(run.returned,run.success+run.failure+run.skipped);
  assert.equal(run.success,0);
  assert.match(run.meaning,/not.*PASS|not demonstrated/i);
 }
 assert.equal(snapshot.observedIndependentReviewCount,0);
 assert.equal(snapshot.gates.length,expectedGates.length);
 assert.deepEqual(snapshot.gates.map(x=>x.id).sort(),[...expectedGates].sort());
 for (const gate of snapshot.gates) {
  assert.ok(statuses.has(gate.status));
  assert.ok(typeof gate.evidence==='string'&&gate.evidence.length>=25);
 }
 const gate = id => snapshot.gates.find(x=>x.id===id);
 assert.equal(gate('19-main-refs-observed').status,'PASS');
 assert.equal(gate('spatial-exact-head-source-suite').status,'PASS');
 assert.equal(gate('studio-178-source-suite').status,'PASS');
 for (const id of expectedGates.filter(x=> !['19-main-refs-observed','spatial-exact-head-source-suite','studio-178-source-suite'].includes(x))) {
  assert.notEqual(gate(id).status,'PASS');
 }
 assert.equal(snapshot.priorIsolatedReceipts.length,4);
 for (const receipt of snapshot.priorIsolatedReceipts) {
  assert.ok(expectedCandidates.has(receipt.repository));
  assert.equal(receipt.productionAccepted,false);
  assert.match(receipt.sha,sha40);
  assert.equal(receipt.sha,snapshot.openDraftCandidates.find(x=>x.repository===receipt.repository).observedHeadSha);
  assert.ok(receipt.results.length>20);
 }
 return true;
}

test('R349 historical-source observation ledger is complete and explicitly nonrelease',()=>assert.ok(verify(load())));
test('rejects removal of any system-of-systems repository',()=>{const s=load();s.repositories.pop();assert.throws(()=>verify(s));});
test('rejects a forged candidate acceptance',()=>{const s=load();s.repositories[0].releaseCandidateAccepted=true;assert.throws(()=>verify(s));});
test('rejects a missing mandatory release gate',()=>{const s=load();s.gates.pop();assert.throws(()=>verify(s));});
test('rejects laundering missing hosted CI into PASS',()=>{const s=load();s.gates.find(x=>x.id==='current-head-hosted-ci').status='PASS';assert.throws(()=>verify(s));});
test('rejects a false global GO',()=>{const s=load();s.releaseVerdict='GO';assert.throws(()=>verify(s));});
test('rejects a mutated source SHA or candidate reference',()=>{const s=load();s.openDraftCandidates[0].observedHeadSha='a'.repeat(40);assert.throws(()=>verify(s));});
test('rejects converting a draft into an accepted merge',()=>{const s=load();s.openDraftCandidates[0].draft=false;s.openDraftCandidates[0].merged=true;assert.throws(()=>verify(s));});
test('rejects mislabeling a prior local pass as production accepted',()=>{const s=load();s.priorIsolatedReceipts[0].productionAccepted=true;assert.throws(()=>verify(s));});
test('rejects a forged independent review count',()=>{const s=load();s.observedIndependentReviewCount=1;assert.throws(()=>verify(s));});
test('rejects fabricated passing GitHub workflow results',()=>{const s=load();s.observedHostedRuns[1].success=1;s.observedHostedRuns[1].failure=4;assert.throws(()=>verify(s));});
test('rejects a missing privacy emulator gate',()=>{const s=load();s.gates=s.gates.filter(g=>g.id!=='privacy-current-head-firebase-emulators');assert.throws(()=>verify(s));});
