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
const privateEvidence = fs.readFileSync(path.join(root, 'scripts/workstream-c-private-evidence.json'), 'utf8');
const privateEvidenceCheck = fs.readFileSync(path.join(root, 'scripts/check-workstream-c-private-evidence.mjs'), 'utf8');

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
  "run_shell_step content web-install \"$CONTENT_DIR\" 'npm run web:install'",
  "run_shell_step private-evidence validate \"$CONTROL_ROOT\" 'node scripts/check-workstream-c-private-evidence.mjs'",
  'record_private_evidence_state',
  'connector-inspected-evidence-bound-not-reexecuted',
  'Four public repositories were cloned and executed at exact SHAs.',
  'Two private repositories are bound to previously inspected exact-head workflow artifacts and digests',
  'SIX-SERVICE AUTHORITY VERIFICATION',
]) {
  assert.ok(manual.includes(marker), `manual verifier core missing marker: ${marker}`);
}
for (const forbidden of [
  'clone_exact urai-analytics',
  'clone_exact urai-communications',
  "npm ci --prefix apps/web",
]) {
  assert.equal(manual.includes(forbidden), false, `manual verifier must not contain ${forbidden}`);
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
assert.equal(ciWorkflow.includes("github.head_ref == 'repin/current-six-core-candidates-20260715'"), false, 'CI must authorize a bounded prefix rather than one branch literal');

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
assert.ok(candidateDoc.includes('credential-free source, build, test and emulator verification only'));
assert.ok(manualDoc.includes('docs/WORKSTREAM_C_CURRENT_CANDIDATES.md'));
assert.ok(manualDoc.includes('scripts/workstream-c-current-candidates.env'));
assert.doesNotMatch(manualDoc, /^- (?:Admin|Privacy|Jobs|Content|Analytics|Communications): `(?:[0-9a-f]{40})`$/m, 'manual runbook must not duplicate candidate literals');

const parsedPrivateEvidence = JSON.parse(privateEvidence);
assert.equal(parsedPrivateEvidence.services.Analytics.sha, expected.ANALYTICS_SHA);
assert.equal(parsedPrivateEvidence.services.Communications.sha, expected.COMMUNICATIONS_SHA);
assert.equal(parsedPrivateEvidence.credentialedStagingExecution, false);
assert.equal(parsedPrivateEvidence.protectedApply, false);
for (const marker of [
  'exact-head-source-evidence-only-no-live-certification',
  'Private repository evidence was inspected through authorized read-only connector access.',
  'does not clone or re-execute this source.',
  'Real delivery remains disabled',
  'No live deployment or persistence is certified',
]) {
  assert.ok(privateEvidence.includes(marker) || privateEvidenceCheck.includes(marker), `private evidence boundary missing marker: ${marker}`);
}

for (const [name, entry] of [['manual', manualEntry], ['cloud', cloudEntry]]) {
  assert.ok(entry.includes('workstream-c-current-candidates.env'), `${name} entrypoint must source the shared candidate manifest`);
  for (const key of candidateKeys) {
    assert.ok(entry.includes(`${key}_OVERRIDE="${'${'}${key}-}"`), `${name} entrypoint must preserve ${key} override`);
    assert.ok(entry.includes(`[ -z "$${key}_OVERRIDE" ] || ${key}="$${key}_OVERRIDE"`), `${name} entrypoint must restore ${key} override`);
  }
  assert.ok(entry.includes('export ADMIN_SHA PRIVACY_SHA JOBS_SHA CONTENT_SHA ANALYTICS_SHA COMMUNICATIONS_SHA'), `${name} entrypoint must export all six exact candidates`);
}
assert.ok(cloudEntry.includes('run-workstream-c-cloud-shell-core.sh'));
assert.ok(manualEntry.includes('run-workstream-c-cloud-shell.sh'));
assert.equal(manualEntry.includes('run-workstream-c-manual-verification-core.sh'), false);

function proveWrapperOverrides(wrapperName, delegatedName) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-workstream-c-wrapper-test-'));
  try {
    fs.copyFileSync(path.join(root, `scripts/${wrapperName}`), path.join(temp, wrapperName));
    fs.copyFileSync(path.join(root, 'scripts/workstream-c-current-candidates.env'), path.join(temp, 'workstream-c-current-candidates.env'));
    fs.writeFileSync(path.join(temp, delegatedName), `#!/usr/bin/env bash\nset -euo pipefail\nprintf "%s|%s|%s|%s|%s|%s\\n" "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA" "$CONTENT_SHA" "$ANALYTICS_SHA" "$COMMUNICATIONS_SHA"\n`);
    fs.chmodSync(path.join(temp, wrapperName), 0o755);
    fs.chmodSync(path.join(temp, delegatedName), 0o755);
    const overrides = Object.fromEntries(candidateKeys.map((key, index) => [key, String.fromCharCode(97 + index).repeat(40)]));
    const result = spawnSync('bash', [path.join(temp, wrapperName)], { cwd: temp, encoding: 'utf8', env: { ...process.env, ...overrides } });
    assert.equal(result.status, 0, `${wrapperName} override probe failed: ${result.stderr}`);
    assert.equal(result.stdout.trim(), candidateKeys.map((key) => overrides[key]).join('|'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

proveWrapperOverrides('run-workstream-c-cloud-shell.sh', 'run-workstream-c-cloud-shell-core.sh');
proveWrapperOverrides('run-workstream-c-manual-verification.sh', 'run-workstream-c-cloud-shell.sh');

const localCommit = repair.indexOf("git commit -m 'fix(jobs): eliminate dependency audit findings'");
const fullVerifier = repair.indexOf('bash scripts/run-workstream-c-cloud-shell.sh');
const remoteRecheck = repair.indexOf('REMOTE_SHA="$(git ls-remote origin');
const push = repair.indexOf('git push origin "HEAD:$JOBS_BRANCH"');
assert.ok(localCommit >= 0 && fullVerifier > localCommit && remoteRecheck > fullVerifier && push > remoteRecheck, 'Jobs repair must remain verification-first and pre-push gated');

for (const marker of [
  'remote publication is not available from this local verification command',
  'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS',
  "! grep -F 'gh auth' \"$PATCHED\"",
  "! grep -F 'git push' \"$PATCHED\"",
  'JOBS_REPAIR_PUBLISH=0 bash "$PATCHED"',
]) {
  assert.ok(repairEntry.includes(marker), `repair entrypoint missing local-only authority marker: ${marker}`);
}
assert.equal(repairEntry.includes('PUBLISH_VERIFIED_JOBS_REPAIR'), false);
assert.ok(manual.includes('case "${WORKSTREAM_C_PUBLISH_SUMMARY:-0}" in'));
assert.ok(manual.includes('GitHub summary publication disabled (default no-mutation mode)'));
assert.ok(manual.includes('Summary publication requires a fully passing verifier'));
assert.ok(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY"'));
assert.equal(manual.includes('gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY" || true'), false);

console.log('PASS: four exact-source lanes plus two private artifact-bound lanes remain confined, explicit, noncredentialed and nondeploying');
