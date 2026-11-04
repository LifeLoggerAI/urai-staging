#!/usr/bin/env node
/**
 * R451 shared emulator checkpoint.
 *
 * Runs the 18-check original Jobs/Privacy identity boundary and the existing
 * 40-check staging lifecycle against one REAL disposable four-service Firebase
 * emulator session. Both must pass. This does NOT connect live Jobs / Privacy
 * callable services, mint grants or prove GCP workload identity / crypto.
 *
 * Run under firebase emulators:exec --only auth,firestore,storage,functions.
 * No live customer data, cloud tokens, IAM changes, deployments or rendering.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = 'urai-staging-test';
const hosts = Object.freeze({
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  FIREBASE_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5001',
});
const currentSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
assert.match(currentSha, /^[0-9a-f]{40}$/);
assert.equal(currentSha, process.env.TARGET_SHA, 'must run exact reviewed immutable Git commit');
assert.equal(process.env.URAI_EMULATOR_PROJECT, project);
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', '', 'cloud credentials forbidden');
assert.equal(process.env.FIREBASE_TOKEN || '', '', 'Firebase cloud token forbidden');
for (const [name, value] of Object.entries(hosts)) {
  assert.equal(process.env[name], value, 'missing fixed local emulator: ' + name);
}
assert.ok(process.env.URAI_R451_RECEIPT, 'R451 combined receipt path required');

const sha256 = b => createHash('sha256').update(b).digest('hex');
const tmp = mkdtempSync(join(tmpdir(), 'urai-r451-four-emulator-'));
function execute(name, script, receiptKey, receiptFile) {
  const output = spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, [receiptKey]: receiptFile },
    encoding: 'utf8',
    timeout: 210_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const log = String(output.stdout || '') + String(output.stderr || '');
  const digest = sha256(Buffer.from(log, 'utf8'));
  console.log('R451_' + name.toUpperCase() + '_RESULT ' + JSON.stringify({
    exit: output.status,
    sha256: digest,
    bytes: Buffer.byteLength(log),
  }));
  if (output.error || output.signal || output.status !== 0) {
    console.error('R451_' + name.toUpperCase() + '_FAIL ' + JSON.stringify({
      exit: output.status,
      signal: output.signal,
      error: output.error?.code || null,
    }));
    // Only synthetic tests run; do not publish process memory or secret tokens.
    console.error(log.slice(-8_000));
    throw new Error(name + '_original_emulator_suite_failed');
  }
  const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
  return { receipt, logSha256: digest };
}
try {
  // Run the NEW source-bound identity check, then the already-maintained 40
  // SDK+Rules+Functions+private-storage lifecycle checks on the SAME emulators.
  const identity = execute(
    'identity', 'functions/test/r450-original-auth-emulator-boundary.mjs',
    'URAI_R450_RECEIPT', join(tmp, 'identity.json'),
  );
  const i = identity.receipt;
  assert.equal(i.schema, 'urai-r450-auth-emulator-boundary-v1');
  assert.equal(i.projectId, project);
  assert.equal(i.testedStagingSource, currentSha);
  assert.equal(i.testsPassed, 18);
  assert.equal(i.checks?.length, 18);
  assert.equal(new Set(i.checks).size, 18);
  assert.equal(i.sourceFilesVerified, 4);
  assert.equal(i.realFirebaseAuthEmulator, true);
  assert.equal(i.originalPrivacyIdentityGuardExecuted, true);
  assert.equal(i.originalJobsTokenProviderExecuted, true);
  assert.equal(i.emulatorCustomLoginExercised, true);
  for (const field of [
    'cloudCryptoVerificationEstablished', 'protectedServiceIAMVerified',
    'activeJobsPrivacySignedBearerAccepted', 'productionJobsTokenAcquired',
    'productionPositiveConsentGranted', 'realPrivacyCallableIntegrated',
    'studioOrReplayIntegrated', 'privateVideoGenerated',
    'productionAccess', 'launchApproved',
  ]) assert.equal(i[field], false, field);

  const lifecycle = execute(
    'lifecycle', 'functions/test/current-cross-service.emulator.mjs',
    'URAI_CROSS_SERVICE_RECEIPT', join(tmp, 'lifecycle.json'),
  );
  const l = lifecycle.receipt;
  assert.equal(l.schemaVersion, 'urai-current-cross-service-emulator-1');
  assert.equal(l.environment, 'disposable-firebase-emulators-only');
  assert.equal(l.projectId, project);
  assert.equal(l.exactStagingSource, currentSha);
  assert.equal(l.testsPassed, 40);
  assert.equal(l.evidence?.length, 40);
  assert.equal(new Set(l.evidence).size, 40);
  assert.deepEqual(l.realEmulatorServices, ['Authentication', 'Firestore', 'Storage', 'Functions']);
  assert.equal(l.syntheticFixturesOnly, true);
  for (const field of [
    'cloudAuthenticated', 'cloudStagingDeployed',
    'jobsWorkerAndPrivacyRuntimeServiceIntegrated',
    'revocationServerPropagationVerified',
    'productionAccessOrSpending', 'finalReleaseAccepted',
  ]) assert.equal(l[field], false, field);

  const combined = {
    schemaVersion: 'urai-r451-four-emulator-combined-1',
    environment: 'disposable-four-firebase-emulators-only',
    exactStagingSource: currentSha,
    projectId: project,
    suites: [
      { name: 'original-jobs-privacy-auth-boundary', passed: 18, logSha256: identity.logSha256 },
      { name: 'original-staging-private-memory-lifecycle', passed: 40, logSha256: lifecycle.logSha256 },
    ],
    checksPassed: 58,
    originalSourceBlobsVerified: 4,
    actualEmulatorServices: ['Authentication', 'Firestore', 'Storage', 'Functions'],
    stagedSyntheticMemoriesOnly: true,
    cryptographicallyVerifiedCloudIAM: false,
    actualJobsWorkerAndPrivacyCallableIntegrated: false,
    actualStudioAndReplayIntegrated: false,
    positiveRenderConsentGranted: false,
    realPrivateMovieGenerationVerified: false,
    productionAccessOrSpending: false,
    finalReleaseAccepted: false,
  };
  writeFileSync(process.env.URAI_R451_RECEIPT, JSON.stringify(combined, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('R451_FOUR_EMULATOR_BOUNDARY_PASS ' + JSON.stringify({
    testsPassed: 58,
    source: currentSha,
    cloudIAMVerified: false,
    realPrivateMovieVerified: false,
    releaseAccepted: false,
  }));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
