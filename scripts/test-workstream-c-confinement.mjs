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
const manualDoc = fs.readFileSync(path.join(root, 'docs/WORKSTREAM_C_MANUAL_VERIFICATION.md'), 'utf8');
const ciWorkflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

const candidateKeys = ['ADMIN_SHA', 'PRIVACY_SHA', 'JOBS_SHA', 'CONTENT_SHA', 'ANALYTICS_SHA', 'COMMUNICATIONS_SHA'];
const candidateLabels = ['Admin', 'Privacy', 'Jobs', 'Content', 'Analytics', 'Communications'];

for (const marker of [
  'WORKSTREAM_C_ROOT must be set by the confined Workstream C wrapper',
  "[ \"${WORKSTREAM_C_CONFINED:-}\" = '1' ]",
  'Direct invocation is forbidden; use run-workstream-c-cloud-shell.sh',
  "[ \"$(dirname -- \"$ROOT\")\" = '/tmp' ]",
  'FIREBASE_TOKEN must be unset',
  'GOOGLE_APPLICATION_CREDENTIALS must be unset',
  'confined_path',
  'JOBS_LOCAL_SOURCE must be the confined Jobs repair checkout',
  'clone_exact urai-content "$CONTENT_SHA"',
  'clone_exact urai-analytics "$ANALYTICS_SHA"',
  'clone_exact urai-communications "$COMMUNICATIONS_SHA"',
  'record_final_source_state content',
  'record_final_source_state analytics',
  'record_final_source_state communications',
  'SIX-SERVICE SOURCE/BUILD/TEST VERIFICATION',
]) {
  assert.ok(manual.includes(marker), `manual verifier core missing marker: ${marker}`);
}
assert.equal(manual.includes('$HOME/urai-workstream-c-manual-'), false, 'manual verifier core must not default evidence into persistent HOME');

for (const marker of [
  'export WORKSTREAM_C_CONFINED=1',
  'WORKSTREAM_C_CONFINED=1',
  'unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS',
  'CLOUDSDK_CONFIG="$ROOT/gcloud-config"',
  'FIREBASE_EMULATORS_PATH="$ROOT/firebase-emulators"',
  'JOBS_LOCAL_SOURCE="$JOBS_LOCAL_SOURCE"',
  'CONTENT_SHA="$CONTENT_SHA"',
  'ANALYTICS_SHA="$ANALYTICS_SHA"',
  'COMMUNICATIONS_SHA="$COMMUNICATIONS_SHA"',
  'REMOTE_CONTROL_SHA=',
  'cleanup_old_verifier_data',
  'MIN_FREE_KB',
  'run-workstream-c-manual-verification-core.sh',
]) {
  assert.ok(wrapper.includes(marker), `confined wrapper core missing marker: ${marker}`);
}
assert.equal(wrapper.includes('run-workstream-c-manual-verification.sh'), false, 'confined launcher must invoke the internal verifier core directly');

for (const marker of [
  'Confined six-service exact-head verification',
  "github.head_ref == 'workstream-c-manual-verification-20260711'",
  "startsWith(github.head_ref, 'repin/current-core-candidates-')",
  "startsWith(github.head_ref, 'repin/current-six-core-candidates-')",
  "github.ref == 'refs/heads/workstream-c-manual-verification-20260711'",
  "startsWith(github.ref, 'refs/heads/repin/current-core-candidates-')",
  "startsWith(github.ref, 'refs/heads/repin/current-six-core-candidates-')",
  'content_sha=',
  'analytics_sha=',
  'communications_sha=',
  'credentialed=false',
  'protected_apply=false',
  'Enforce confined cross-service result',
]) {
  assert.ok(ciWorkflow.includes(marker), `CI six-service authority missing marker: ${marker}`);
}
assert.equal(ciWorkflow.includes("github.head_ref == 'repin/current-six-core-candidates-20260715'"), false, 'CI must authorize the bounded repin prefix rather than one date-specific branch');

const localCommit = repair.indexOf("git commit -m 'fix(jobs): eliminate dependency audit findings'");
const fullVerifier = repair.indexOf('bash scripts/run-workstream-c-cloud-shell.sh');
const remoteRecheck = repair.indexOf('REMOTE_SHA="$(git ls-remote origin');
const push = repair.indexOf('git push origin "HEAD:$JOBS_BRANCH"');
const comment = repair.indexOf('gh pr comment 75');
assert.ok(localCommit >= 0, 'repair operator core must create one local candidate commit');
assert.ok(fullVerifier > localCommit, 'complete verifier must run after the exact local candidate exists');
assert.ok(remoteRecheck > fullVerifier, 'remote head must be rechecked after complete verification');
assert.ok(push > remoteRecheck, 'legacy publication template must remain after verification and remote recheck');
assert.ok(comment > push, 'legacy receipt publication template must remain after the verified push');

for (const marker of [
  "[ \"$RUN_FULL_VERIFIER_AFTER_REPAIR\" = '1' ]",
  'Remote mutation is forbidden unless the complete Workstream C verifier is enabled',
  'JOBS_LOCAL_SOURCE="$REPO"',
  'ADMIN_SHA="$ADMIN_SHA"',
  'PRIVACY_SHA="$PRIVACY_SHA"',
]) {
  assert.ok(repair.includes(marker), `repair operator core missing pre-push gate: ${marker}`);
}

function parseCandidates(source) {
  const parsed = {};
  for (const key of candidateKeys) {
    const match = source.match(new RegExp(`^${key}='([0-9a-f]{40})'$`, 'm'));
    assert.ok(match, `candidate manifest must define full lowercase ${key}`);
    parsed[key] = match[1];
  }
  return parsed;
}

const expected = parseCandidates(candidates);
assert.equal(new Set(Object.values(expected)).size, 6, 'candidate manifest must pin six distinct exact SHAs');
for (let index = 0; index < candidateKeys.length; index += 1) {
  const key = candidateKeys[index];
  const sha = expected[key];
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.ok(candidateDoc.includes(`- ${candidateLabels[index]}: \`${sha}\``), `candidate documentation missing ${key}`);
}
assert.ok(candidateDoc.includes('scripts/workstream-c-current-candidates.env'));
assert.ok(candidateDoc.includes('credential-free source, build, test and emulator verification only'));
assert.ok(manualDoc.includes('docs/WORKSTREAM_C_CURRENT_CANDIDATES.md'));
assert.ok(manualDoc.includes('scripts/workstream-c-current-candidates.env'));
assert.doesNotMatch(manualDoc, /^- (?:Admin|Privacy|Jobs|Content|Analytics|Communications): `(?:[0-9a-f]{40})`$/m, 'manual runbook must not duplicate candidate literals');

for (const [name, entry] of [
  ['manual', manualEntry],
  ['cloud', cloudEntry],
]) {
  assert.ok(entry.includes('workstream-c-current-candidates.env'), `${name} entrypoint must source the shared candidate manifest`);
  for (const key of candidateKeys) {
    assert.ok(entry.includes(`${key}_OVERRIDE="${'${'}${key}-}"`), `${name} entrypoint must preserve ${key} override`);
    assert.ok(entry.includes(`[ -z "$${key}_OVERRIDE" ] || ${key}="$${key}_OVERRIDE"`), `${name} entrypoint must restore ${key} override`);
  }
  assert.ok(entry.includes('export ADMIN_SHA PRIVACY_SHA JOBS_SHA CONTENT_SHA ANALYTICS_SHA COMMUNICATIONS_SHA'), `${name} entrypoint must export all six exact candidates`);
}
assert.ok(cloudEntry.includes('run-workstream-c-cloud-shell-core.sh'), 'cloud entrypoint must invoke confined launcher core');
assert.ok(manualEntry.includes('run-workstream-c-cloud-shell.sh'), 'manual entrypoint must route through the confined launcher');
assert.equal(manualEntry.includes('run-workstream-c-manual-verification-core.sh'), false, 'manual entrypoint must not invoke verifier core directly');

function proveWrapperOverrides(wrapperName, delegatedName) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-workstream-c-wrapper-test-'));
  try {
    fs.copyFileSync(path.join(root, `scripts/${wrapperName}`), path.join(temp, wrapperName));
    fs.copyFileSync(path.join(root, 'scripts/workstream-c-current-candidates.env'), path.join(temp, 'workstream-c-current-candidates.env'));
    fs.writeFileSync(path.join(temp, delegatedName), `#!/usr/bin/env bash\nset -euo pipefail\nprintf "%s|%s|%s|%s|%s|%s\\n" "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA" "$CONTENT_SHA" "$ANALYTICS_SHA" "$COMMUNICATIONS_SHA"\n`);
    fs.chmodSync(path.join(temp, wrapperName), 0o755);
    fs.chmodSync(path.join(temp, delegatedName), 0o755);
    const overrides = {
      ADMIN_SHA: 'a'.repeat(40),
      PRIVACY_SHA: 'b'.repeat(40),
      JOBS_SHA: 'c'.repeat(40),
      CONTENT_SHA: 'd'.repeat(40),
      ANALYTICS_SHA: 'e'.repeat(40),
      COMMUNICATIONS_SHA: 'f'.repeat(40),
    };
    const result = spawnSync('bash', [path.join(temp, wrapperName)], { cwd: temp, encoding: 'utf8', env: { ...process.env, ...overrides } });
    assert.equal(result.status, 0, `${wrapperName} override probe failed: ${result.stderr}`);
    assert.equal(result.stdout.trim(), candidateKeys.map((key) => overrides[key]).join('|'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

proveWrapperOverrides('run-workstream-c-cloud-shell.sh', 'run-workstream-c-cloud-shell-core.sh');
proveWrapperOverrides('run-workstream-c-manual-verification.sh', 'run-workstream-c-cloud-shell.sh');

for (const marker of [
  'workstream-c-current-candidates.env',
  'repair-jobs-unused-error-reporting-core.sh',
  "grep -Fx \"ADMIN_SHA='$ADMIN_SHA'\"",
  "grep -Fx \"PRIVACY_SHA='$PRIVACY_SHA'\"",
  "grep -Fx \"EXPECTED_JOBS_SHA='$JOBS_SHA'\"",
  "[ \"${JOBS_REPAIR_PUBLISH:-0}\" = '0' ]",
  'remote publication is not available from this local verification command',
  'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS',
  "! grep -F 'gh auth' \"$PATCHED\"",
  "! grep -F 'git push' \"$PATCHED\"",
  'JOBS_REPAIR_PUBLISH=0 bash "$PATCHED"',
]) {
  assert.ok(repairEntry.includes(marker), `repair entrypoint missing local-only authority marker: ${marker}`);
}
assert.equal(repairEntry.includes('PUBLISH_VERIFIED_JOBS_REPAIR'), false, 'official repair entrypoint must not expose remote publication confirmation');
assert.ok(repairEntry.includes("source = source.split(publish_marker, 1)[0]"), 'repair entrypoint must truncate the legacy publication tail');
assert.ok(repairEntry.includes("! grep -F 'gh api' \"$PATCHED\""), 'repair entrypoint must reject GitHub identity calls');
assert.ok(repairEntry.includes("! grep -F 'gh pr comment' \"$PATCHED\""), 'repair entrypoint must reject PR comment mutation');

assert.ok(manual.includes('case "${WORKSTREAM_C_PUBLISH_SUMMARY:-0}" in'));
assert.ok(manual.includes('GitHub summary publication disabled (default no-mutation mode)'));
assert.ok(manual.includes('Summary publication requires a fully passing verifier'));
assert.ok(manual.includes('Summary publication requested but gh is not authenticated'));
assert.ok(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY"'));
assert.equal(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY" || true'), false);

console.log('PASS: six-service Workstream C confinement, launcher routing, bounded repin authority, override authority, no-publication defaults and exact-candidate manifest');
