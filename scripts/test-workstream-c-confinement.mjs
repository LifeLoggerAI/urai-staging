#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const manual = fs.readFileSync(path.join(root, 'scripts/run-workstream-c-manual-verification-core.sh'), 'utf8');
const wrapper = fs.readFileSync(path.join(root, 'scripts/run-workstream-c-cloud-shell-core.sh'), 'utf8');
const repair = fs.readFileSync(path.join(root, 'scripts/repair-jobs-unused-error-reporting-core.sh'), 'utf8');
const manualEntry = fs.readFileSync(path.join(root, 'scripts/run-workstream-c-manual-verification.sh'), 'utf8');
const cloudEntry = fs.readFileSync(path.join(root, 'scripts/run-workstream-c-cloud-shell.sh'), 'utf8');
const repairEntry = fs.readFileSync(path.join(root, 'scripts/repair-jobs-unused-error-reporting.sh'), 'utf8');
const candidates = fs.readFileSync(path.join(root, 'scripts/workstream-c-current-candidates.env'), 'utf8');
const candidateDoc = fs.readFileSync(path.join(root, 'docs/WORKSTREAM_C_CURRENT_CANDIDATES.md'), 'utf8');

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

function parseCandidates(source) {
  const parsed = {};
  for (const key of ['ADMIN_SHA', 'PRIVACY_SHA', 'JOBS_SHA']) {
    const match = source.match(new RegExp(`^${key}='([0-9a-f]{40})'$`, 'm'));
    assert.ok(match, `candidate manifest must define full lowercase ${key}`);
    parsed[key] = match[1];
  }
  return parsed;
}

const expected = parseCandidates(candidates);
assert.equal(new Set(Object.values(expected)).size, 3, 'candidate manifest must pin three distinct exact SHAs');
for (const [name, sha] of Object.entries(expected)) {
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.ok(candidateDoc.includes(`\`${sha}\``), `candidate documentation missing ${name}`);
}
assert.ok(candidateDoc.includes('scripts/workstream-c-current-candidates.env'));

for (const [name, entry, coreName] of [
  ['manual', manualEntry, 'run-workstream-c-manual-verification-core.sh'],
  ['cloud', cloudEntry, 'run-workstream-c-cloud-shell-core.sh'],
]) {
  assert.ok(entry.includes('workstream-c-current-candidates.env'), `${name} entrypoint must source the shared candidate manifest`);
  assert.ok(entry.includes('ADMIN_SHA_OVERRIDE="${ADMIN_SHA-}"'), `${name} entrypoint must preserve Admin override`);
  assert.ok(entry.includes('PRIVACY_SHA_OVERRIDE="${PRIVACY_SHA-}"'), `${name} entrypoint must preserve Privacy override`);
  assert.ok(entry.includes('JOBS_SHA_OVERRIDE="${JOBS_SHA-}"'), `${name} entrypoint must preserve Jobs override`);
  assert.ok(entry.includes('[ -z "$ADMIN_SHA_OVERRIDE" ] || ADMIN_SHA="$ADMIN_SHA_OVERRIDE"'), `${name} entrypoint must restore Admin override`);
  assert.ok(entry.includes('[ -z "$PRIVACY_SHA_OVERRIDE" ] || PRIVACY_SHA="$PRIVACY_SHA_OVERRIDE"'), `${name} entrypoint must restore Privacy override`);
  assert.ok(entry.includes('[ -z "$JOBS_SHA_OVERRIDE" ] || JOBS_SHA="$JOBS_SHA_OVERRIDE"'), `${name} entrypoint must restore Jobs override`);
  assert.ok(entry.includes('export ADMIN_SHA PRIVACY_SHA JOBS_SHA'), `${name} entrypoint must export exact candidates`);
  assert.ok(entry.includes(coreName), `${name} entrypoint must invoke its preserved core`);
}

function proveWrapperOverrides(wrapperName, coreName) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-workstream-c-wrapper-test-'));
  try {
    fs.copyFileSync(path.join(root, `scripts/${wrapperName}`), path.join(temp, wrapperName));
    fs.copyFileSync(path.join(root, 'scripts/workstream-c-current-candidates.env'), path.join(temp, 'workstream-c-current-candidates.env'));
    fs.writeFileSync(path.join(temp, coreName), '#!/usr/bin/env bash\nset -euo pipefail\nprintf "%s|%s|%s\\n" "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"\n');
    fs.chmodSync(path.join(temp, wrapperName), 0o755);
    fs.chmodSync(path.join(temp, coreName), 0o755);
    const overrides = { ADMIN_SHA: 'a'.repeat(40), PRIVACY_SHA: 'b'.repeat(40), JOBS_SHA: 'c'.repeat(40) };
    const result = spawnSync('bash', [path.join(temp, wrapperName)], { cwd: temp, encoding: 'utf8', env: { ...process.env, ...overrides } });
    assert.equal(result.status, 0, `${wrapperName} override probe failed: ${result.stderr}`);
    assert.equal(result.stdout.trim(), `${overrides.ADMIN_SHA}|${overrides.PRIVACY_SHA}|${overrides.JOBS_SHA}`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

proveWrapperOverrides('run-workstream-c-cloud-shell.sh', 'run-workstream-c-cloud-shell-core.sh');
proveWrapperOverrides('run-workstream-c-manual-verification.sh', 'run-workstream-c-manual-verification-core.sh');

for (const marker of [
  'workstream-c-current-candidates.env',
  'repair-jobs-unused-error-reporting-core.sh',
  "grep -Fx \"ADMIN_SHA='$ADMIN_SHA'\"",
  "grep -Fx \"PRIVACY_SHA='$PRIVACY_SHA'\"",
  "grep -Fx \"EXPECTED_JOBS_SHA='$JOBS_SHA'\"",
  'case "${JOBS_REPAIR_PUBLISH:-0}" in',
  'JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR',
  'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS',
  "strict_comment = masked_comment.removesuffix(' || true')",
  "! grep -F 'gh pr comment 75' \"$PATCHED\" | grep -F '|| true'",
]) {
  assert.ok(repairEntry.includes(marker), `repair entrypoint missing current-candidate or publication marker: ${marker}`);
}
assert.ok(repairEntry.indexOf('JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS') < repairEntry.indexOf('gh auth setup-git >/dev/null'), 'local no-publish exit must be injected before remote authentication');
assert.ok(repairEntry.includes("if [ \"${JOBS_REPAIR_PUBLISH:-0}\" = '1' ]"), 'repair wrapper must require explicit publication mode');
assert.ok(repairEntry.includes("[ \"${JOBS_REPAIR_PUBLISH_CONFIRM:-}\" != 'PUBLISH_VERIFIED_JOBS_REPAIR' ]"), 'repair wrapper must require exact publication confirmation');

assert.ok(manual.includes('case "${WORKSTREAM_C_PUBLISH_SUMMARY:-0}" in'));
assert.ok(manual.includes('GitHub summary publication disabled (default no-mutation mode)'));
assert.ok(manual.includes('Summary publication requires a fully passing verifier'));
assert.ok(manual.includes('Summary publication requested but gh is not authenticated'));
assert.ok(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY"'));
assert.equal(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY" || true'), false);

console.log('PASS: Workstream C confinement, override authority, no-publication defaults, explicit repair publication, and live exact-candidate manifest');
