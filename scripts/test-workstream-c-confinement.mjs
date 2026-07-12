#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manual = readFileSync(new URL('./run-workstream-c-manual-verification.sh', import.meta.url), 'utf8');
const wrapper = readFileSync(new URL('./run-workstream-c-cloud-shell.sh', import.meta.url), 'utf8');
const repair = readFileSync(new URL('./repair-jobs-unused-error-reporting.sh', import.meta.url), 'utf8');

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
  assert.ok(manual.includes(marker), `manual verifier missing confinement marker: ${marker}`);
}
assert.equal(manual.includes('$HOME/urai-workstream-c-manual-'), false, 'manual verifier must not default evidence into persistent HOME');

for (const marker of [
  'export WORKSTREAM_C_CONFINED=1',
  'WORKSTREAM_C_CONFINED=1',
  'unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS',
  'CLOUDSDK_CONFIG="$ROOT/gcloud-config"',
  'FIREBASE_EMULATORS_PATH="$ROOT/firebase-emulators"',
  'JOBS_LOCAL_SOURCE="$JOBS_LOCAL_SOURCE"',
]) {
  assert.ok(wrapper.includes(marker), `confined wrapper missing marker: ${marker}`);
}

const localCommit = repair.indexOf("git commit -m 'fix(jobs): eliminate dependency audit findings'");
const fullVerifier = repair.indexOf('bash scripts/run-workstream-c-cloud-shell.sh');
const remoteRecheck = repair.indexOf('REMOTE_SHA="$(git ls-remote origin');
const push = repair.indexOf('git push origin "HEAD:$JOBS_BRANCH"');
const comment = repair.indexOf('gh pr comment 75');
assert.ok(localCommit >= 0, 'repair operator must create one local candidate commit');
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
  assert.ok(repair.includes(marker), `repair operator missing pre-push gate: ${marker}`);
}

console.log('PASS: Workstream C confinement and pre-push verification authority');
