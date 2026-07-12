#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manual = readFileSync(new URL('./run-workstream-c-manual-verification-core.sh', import.meta.url), 'utf8');
const wrapper = readFileSync(new URL('./run-workstream-c-cloud-shell-core.sh', import.meta.url), 'utf8');
const repair = readFileSync(new URL('./repair-jobs-unused-error-reporting-core.sh', import.meta.url), 'utf8');
const manualEntry = readFileSync(new URL('./run-workstream-c-manual-verification.sh', import.meta.url), 'utf8');
const cloudEntry = readFileSync(new URL('./run-workstream-c-cloud-shell.sh', import.meta.url), 'utf8');
const repairEntry = readFileSync(new URL('./repair-jobs-unused-error-reporting.sh', import.meta.url), 'utf8');
const candidates = readFileSync(new URL('./workstream-c-current-candidates.env', import.meta.url), 'utf8');

for (const marker of [
  'WORKSTREAM_C_ROOT must be set by the confined Workstream C wrapper',
  "[ \"${WORKSTREAM_C_CONFINED:-}\" = '1' ]",
  'Direct invocation is forbidden; use run-workstream-c-cloud-shell.sh',
  "[ \"$(dirname -- \"$ROOT\")\" = '/tmp' ]",
  'FIREBASE_TOKEN must be unset',
  'GOOGLE_APPLICATION_CREDENTIALS must be unset',
  'confined_path',
  'JOBS_LOCAL_SOURCE must be the confined Jobs repair checkout',
]) {
  assert.ok(manual.includes(marker), `manual verifier core missing confinement marker: ${marker}`);
}
assert.equal(manual.includes('$HOME/urai-workstream-c-manual-'), false, 'manual verifier core must not default evidence into persistent HOME');

for (const marker of [
  'export WORKSTREAM_C_CONFINED=1',
  'WORKSTREAM_C_CONFINED=1',
  'unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS',
  'CLOUDSDK_CONFIG="$ROOT/gcloud-config"',
  'FIREBASE_EMULATORS_PATH="$ROOT/firebase-emulators"',
  'JOBS_LOCAL_SOURCE="$JOBS_LOCAL_SOURCE"',
]) {
  assert.ok(wrapper.includes(marker), `confined wrapper core missing marker: ${marker}`);
}

const localCommit = repair.indexOf("git commit -m 'fix(jobs): eliminate dependency audit findings'");
const fullVerifier = repair.indexOf('bash scripts/run-workstream-c-cloud-shell.sh');
const remoteRecheck = repair.indexOf('REMOTE_SHA="$(git ls-remote origin');
const push = repair.indexOf('git push origin "HEAD:$JOBS_BRANCH"');
const comment = repair.indexOf('gh pr comment 75');
assert.ok(localCommit >= 0, 'repair operator core must create one local candidate commit');
assert.ok(fullVerifier > localCommit, 'complete verifier must run after the exact local candidate exists');
assert.ok(remoteRecheck > fullVerifier, 'remote head must be rechecked after complete verification');
assert.ok(push > remoteRecheck, 'push must occur only after verification and remote recheck');
assert.ok(comment > push, 'receipt publication comment must occur only after the verified push');

for (const marker of [
  "[ \"$RUN_FULL_VERIFIER_AFTER_REPAIR\" = '1' ]",
  'Remote mutation is forbidden unless the complete Workstream C verifier is enabled',
  'JOBS_LOCAL_SOURCE="$REPO"',
  'ADMIN_SHA="$ADMIN_SHA"',
  'PRIVACY_SHA="$PRIVACY_SHA"',
  'The commit and this receipt may be pushed only after the complete confined Admin/Privacy/Jobs verifier passes',
]) {
  assert.ok(repair.includes(marker), `repair operator core missing pre-push gate: ${marker}`);
}

const expected = {
  ADMIN_SHA: '57f1fb0f0a0ce7abfb5cff441a0787a5d4a0afbb',
  PRIVACY_SHA: '371e9a8db9b24a0cbdd3a6753776be6920ce736c',
  JOBS_SHA: 'ed7f80517e4fa940472a93f22e9d42e080ddeb6c',
};
for (const [name, sha] of Object.entries(expected)) {
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.ok(candidates.includes(`${name}='${sha}'`), `candidate manifest missing ${name}`);
}
for (const [name, entry, coreName] of [
  ['manual', manualEntry, 'run-workstream-c-manual-verification-core.sh'],
  ['cloud', cloudEntry, 'run-workstream-c-cloud-shell-core.sh'],
]) {
  assert.ok(entry.includes('workstream-c-current-candidates.env'), `${name} entrypoint must source the shared candidate manifest`);
  assert.ok(entry.includes('export ADMIN_SHA PRIVACY_SHA JOBS_SHA'), `${name} entrypoint must export exact candidates`);
  assert.ok(entry.includes(coreName), `${name} entrypoint must invoke its preserved core`);
  assert.equal(entry.includes('6d1e84640544098ae71040fca4c7f8893e0f2fd4'), false, `${name} entrypoint must not pin the superseded Admin head`);
}
for (const marker of [
  'workstream-c-current-candidates.env',
  'repair-jobs-unused-error-reporting-core.sh',
  "grep -Fx \"ADMIN_SHA='$ADMIN_SHA'\"",
  "grep -Fx \"PRIVACY_SHA='$PRIVACY_SHA'\"",
  "grep -Fx \"EXPECTED_JOBS_SHA='$JOBS_SHA'\"",
]) {
  assert.ok(repairEntry.includes(marker), `repair entrypoint missing current-candidate marker: ${marker}`);
}
assert.equal(repairEntry.includes('6d1e84640544098ae71040fca4c7f8893e0f2fd4'), false, 'repair entrypoint must not pin the superseded Admin head');

console.log('PASS: Workstream C confinement, pre-push authority, and current exact-candidate manifest');
