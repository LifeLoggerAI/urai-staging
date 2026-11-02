#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const path = new URL('../docs/release-evidence/r317-20261102-system-of-systems.json', import.meta.url);
const statusSet = new Set(['PASS','FAIL','BLOCKED','NOT RUN','NOT APPLICABLE']);
const requiredGateIds = ['19-main-refs-observed','jobs-233-media-suite','studio-178-media-suite','current-head-hosted-ci','trusted-private-consent-issuer','jobs-privacy-studio-runtime','original-spatial-native-webgl','protected-staging-rollback','accessibility-performance-i18n-xr','store-stripe-provider-readiness','genesis-native-film','independent-non-author-review','founder-production-authorization'];

function validate(m) {
  assert.equal(m.schemaVersion,'urai.genesis.release-evidence-snapshot.v1');
  assert.equal(m.repositories.length,19);
  assert.equal(new Set(m.repositories.map(r=>r.name)).size,19);
  assert.ok(m.repositories.every(r=>/^[a-f0-9]{40}$/.test(r.mainSha) && r.releaseCandidateAccepted === false));
  assert.ok(m.openDraftCandidates.every(p=>m.repositories.some(r=>r.name===p.repository) && /^[a-f0-9]{40}$/.test(p.observedHeadSha) && p.draft === true && p.merged === false));
  assert.equal(new Set(m.gates.map(g=>g.id)).size,m.gates.length);
  assert.deepEqual([...m.gates.map(g=>g.id)].sort(),[...requiredGateIds].sort());
  assert.ok(m.gates.every(g=>statusSet.has(g.status) && typeof g.evidence==='string' && g.evidence.length>=16));
  assert.equal(m.releaseVerdict, m.gates.every(g=>g.status==='PASS'||g.status==='NOT APPLICABLE') ? 'GO' : 'NO-GO');
  assert.equal(m.releaseVerdict,'NO-GO');
}

test('R317 exact-source observation ledger is complete and fail-closed',()=>validate(JSON.parse(readFileSync(path,'utf8'))));
test('R317 ledger refuses false GO with blocked CI',()=>{const m=JSON.parse(readFileSync(path,'utf8'));m.releaseVerdict='GO';assert.throws(()=>validate(m));});
test('R317 ledger refuses missing approval gate',()=>{const m=JSON.parse(readFileSync(path,'utf8'));m.gates=m.gates.filter(g=>g.id!=='independent-non-author-review');assert.throws(()=>validate(m));});
test('R317 ledger refuses unverified repo release acceptance',()=>{const m=JSON.parse(readFileSync(path,'utf8'));m.repositories[0].releaseCandidateAccepted=true;assert.throws(()=>validate(m));});
