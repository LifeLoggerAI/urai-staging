#!/usr/bin/env node
/**
 * R450 — source-bound Firebase Auth emulator acceptance, with honest boundaries.
 *
 * Firebase's Auth emulator issues unsigned ID tokens and does NOT reproduce
 * Cloud IAM or cryptographic trust. This test MUST NOT fabricate signatures,
 * insert localId into responses, or enable the Life Movie render grant.
 *
 * It verifies real emulator issuance and Admin decoding of a dedicated
 * synthetic Jobs identity, tests original Privacy's claim decisions, and
 * asserts original Jobs + Privacy reject emulator-only unsigned bearer paths.
 * Protected signed-token service integration remains a separate HOLD gate.
 */
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { requireFirebaseAuthDenial } from '../../scripts/r454-specific-firebase-denial.mjs';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import { getAuth as getClientAuth, connectAuthEmulator, signInWithCustomToken, createUserWithEmailAndPassword, getIdToken, signOut } from 'firebase/auth';

const PROJECT = 'urai-staging-test';
const SERVICE_UID = 'urai-jobs-r450-synthetic';
const HOST = '127.0.0.1:9099';
const API_KEY = 'r450SyntheticEmulatorKey0123456789';
const BASE = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE_ROOT = join(BASE, 'scripts/fixtures/r424-signed');
const manifest = JSON.parse(readFileSync(join(FIXTURE_ROOT, 'manifest.json'), 'utf8'));
const requireFromFunctions = createRequire(new URL('../package.json', import.meta.url));
const ts = requireFromFunctions('typescript');
const sourceFiles = [
  ['jobs/functions/src/privacy/lifeMovieJobsTokenProvider.ts', 'lifeMovieJobsTokenProvider.js'],
  ['jobs/functions/src/privacy/lifeMovieBoundedResponse.ts', 'lifeMovieBoundedResponse.js'],
  ['jobs/functions/src/privacy/lifeMovieConsentGate.ts', 'lifeMovieConsentGate.js'],
  ['privacy/functions/src/life-movie-jobs-identity.ts', 'life-movie-jobs-identity.js'],
];
const checks = [];
const pass = name => checks.push(name);
const blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const mustReject = async (name, thunk, allowedCodes, messagePattern = null) => {
  await requireFirebaseAuthDenial(name, thunk, allowedCodes, messagePattern);
  pass(name);
};

assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, HOST);
assert.equal(process.env.URAI_EMULATOR_PROJECT, PROJECT);
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', '');
assert.equal(process.env.FIREBASE_TOKEN || '', '');
assert.equal(manifest.schemaVersion, 'urai-r424-signed-rehearsal-v1');
assert.equal(manifest.productionAuthorized, false);
pass('real-disposable-emulator-only-no-cloud-credential');

const tmp = mkdtempSync(join(tmpdir(), 'urai-r450-source-'));
let adminApp, serviceApp, ownerApp, otherProjectApp;
try {
  writeFileSync(join(tmp, 'package.json'), '{"type":"module"}\n');
  for (const [relative, output] of sourceFiles) {
    const bytes = readFileSync(join(FIXTURE_ROOT, relative));
    assert.equal(blob(bytes), manifest.sha[relative], 'ORIGINAL_SOURCE_DRIFT ' + relative);
    const compiled = ts.transpileModule(bytes.toString('utf8'), {
      fileName: relative,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    });
    assert.equal((compiled.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
    writeFileSync(join(tmp, output), compiled.outputText);
  }
  pass('original-jobs-privacy-four-source-blobs-verified');

  const privacy = await import(pathToFileURL(join(tmp, 'life-movie-jobs-identity.js')).href);
  const jobs = await import(pathToFileURL(join(tmp, 'lifeMovieJobsTokenProvider.js')).href);
  const gate = await import(pathToFileURL(join(tmp, 'lifeMovieConsentGate.js')).href);
  assert.equal(gate.lifeMovieConsentAuthorityAvailable(), false);
  assert.equal(gate.deferLifeMovieJob({ type: 'studio.render.video' }), true);
  pass('original-jobs-life-movie-render-authority-hard-off');

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  // This synthetic key is only in process memory for the disposable emulator.
  adminApp = initializeAdminApp({
    projectId: PROJECT,
    credential: cert({
      projectId: PROJECT,
      clientEmail: 'r450-synthetic@urai-staging-test.iam.gserviceaccount.com',
      privateKey,
    }),
  }, 'r450-emulator-only-issuer');
  const adminAuth = getAdminAuth(adminApp);
  const config = {
    apiKey: API_KEY, projectId: PROJECT,
    authDomain: PROJECT + '.firebaseapp.com',
    appId: '1:123456789:web:r450synthetic',
  };
  serviceApp = initializeClientApp(config, 'r450-custom-service');
  const serviceClient = getClientAuth(serviceApp);
  connectAuthEmulator(serviceClient, 'http://' + HOST, { disableWarnings: true });

  // Use emulator-native unsigned custom-token login as-is. Do not re-sign.
  const unsignedCustom = await adminAuth.createCustomToken(SERVICE_UID, {
    system: true, role: 'system', consumerId: 'urai-jobs',
  });
  assert.equal(unsignedCustom.split('.').length, 3);
  assert.equal(unsignedCustom.split('.')[2], '', 'Firebase emulator should generate unsigned custom JWT');
  pass('emulator-native-custom-token-is-unsigned');

  const login = await signInWithCustomToken(serviceClient, unsignedCustom);
  assert.equal(login.user.uid, SERVICE_UID);
  pass('real-auth-emulator-custom-service-login');

  const serviceIdToken = await getIdToken(login.user);
  assert.equal(serviceIdToken.split('.').length, 3);
  assert.equal(serviceIdToken.split('.')[2], '', 'Firebase emulator ID tokens must remain unsigned');
  pass('real-auth-emulator-id-token-is-unsigned');

  const verified = await adminAuth.verifyIdToken(serviceIdToken, true);
  assert.equal(verified.uid, SERVICE_UID);
  assert.equal(verified.aud, PROJECT);
  assert.equal(verified.system, true);
  assert.equal(verified.role, 'system');
  assert.equal(verified.consumerId, 'urai-jobs');
  assert.equal(verified.firebase?.sign_in_provider, 'custom');
  pass('admin-sdk-decoded-emulator-token-has-correct-custom-claims');

  const identity = { uid: verified.uid, token: verified };
  assert.equal(privacy.isTrustedJobsConsentCaller(identity, SERVICE_UID), true);
  pass('original-privacy-source-trusts-verified-emulator-custom-claims');

  assert.equal(privacy.isTrustedJobsConsentCaller(identity, 'other-system-uid'), false);
  pass('original-privacy-source-denies-wrong-pinned-uid');
  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: verified.uid, token: { ...verified, role: 'admin' } }, SERVICE_UID,
  ), false);
  pass('original-privacy-source-denies-role-substitution');
  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: verified.uid, token: { ...verified, consumerId: 'foreign-connector' } }, SERVICE_UID,
  ), false);
  pass('original-privacy-source-denies-consumer-substitution');
  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: verified.uid, token: { ...verified, firebase: { sign_in_provider: 'password' } } }, SERVICE_UID,
  ), false);
  pass('original-privacy-source-denies-signin-provider-substitution');

  let verifyCalls = 0;
  const verifyLive = async (token, revoked) => {
    verifyCalls++;
    return await adminAuth.verifyIdToken(token, revoked);
  };
  // Deliberately NO fake JWT signature and NO fabricated Firebase Admin
  // verification success. The production guard's JWT shape requirement blocks
  // the emulator token and cannot be approved by this test.
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, SERVICE_UID, 'Bearer ' + serviceIdToken, verifyLive,
  ), false);
  assert.equal(verifyCalls, 0);
  pass('original-active-privacy-source-fails-closed-on-unsigned-emulator-bearer');

  let outboundRequests = 0;
  const tokenProvider = jobs.createDedicatedJobsFirebaseIdTokenProvider({
    firebaseProjectId: PROJECT, dedicatedJobsUid: SERVICE_UID, firebaseWebApiKey: API_KEY,
  }, { adminAuth, fetchImpl: async () => { outboundRequests++; throw new Error('blocked-request'); } });
  await assert.rejects(tokenProvider, /life_movie_consent_jobs_identity_unavailable/);
  assert.equal(outboundRequests, 0);
  pass('original-jobs-provider-denies-unsigned-custom-token-before-network');

  ownerApp = initializeClientApp(config, 'r450-ordinary-owner');
  const ownerAuth = getClientAuth(ownerApp);
  connectAuthEmulator(ownerAuth, 'http://' + HOST, { disableWarnings: true });
  const owner = (await createUserWithEmailAndPassword(
    ownerAuth, 'r450-ordinary-owner@example.test', 'R450-SYNTHETIC-NOT-A-PASSWORD-2026!',
  )).user;
  const ordinaryClaims = await adminAuth.verifyIdToken(await getIdToken(owner), true);
  assert.notEqual(ordinaryClaims.uid, SERVICE_UID);
  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: ordinaryClaims.uid, token: ordinaryClaims }, SERVICE_UID,
  ), false);
  pass('real-emulator-password-user-denied-by-original-privacy-source');

  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: verified.uid, token: { ...verified, system: false } }, SERVICE_UID,
  ), false);
  pass('original-privacy-source-denies-forged-system-flag');

  otherProjectApp = initializeAdminApp({ projectId: 'urai-r450-other' }, 'r450-other-project');
  await mustReject('other-project-admin-rejects-emulator-id-token', async () => {
    await getAdminAuth(otherProjectApp).verifyIdToken(serviceIdToken, true);
  }, ['auth/argument-error', 'auth/invalid-id-token'], /aud(?:ience)?|project/i);

  await adminAuth.updateUser(SERVICE_UID, { disabled: true });
  await mustReject('disabled-service-rejected-by-firebase-admin-check-revoked', async () => {
    await adminAuth.verifyIdToken(serviceIdToken, true);
  }, ['auth/user-disabled']);

  // No tests mutate external GCP state. Receipt must not be mistaken for
  // a positive cross-project identity grant or end-to-end private rendering.
  const receipt = {
    schema: 'urai-r450-auth-emulator-boundary-v1',
    projectId: PROJECT,
    environment: 'firebase-auth-emulator-only',
    testedStagingSource: process.env.TARGET_SHA || 'unprovided',
    sourceBaselineRefs: manifest.refs,
    sourceFilesVerified: sourceFiles.length,
    testsPassed: checks.length,
    checks,
    realFirebaseAuthEmulator: true,
    originalPrivacyIdentityGuardExecuted: true,
    originalJobsTokenProviderExecuted: true,
    emulatorCustomLoginExercised: true,
    cloudCryptoVerificationEstablished: false,
    protectedServiceIAMVerified: false,
    activeJobsPrivacySignedBearerAccepted: false,
    productionJobsTokenAcquired: false,
    productionPositiveConsentGranted: false,
    realPrivacyCallableIntegrated: false,
    studioOrReplayIntegrated: false,
    privateVideoGenerated: false,
    productionAccess: false,
    launchApproved: false,
  };
  if (process.env.URAI_R450_RECEIPT) {
    writeFileSync(process.env.URAI_R450_RECEIPT, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  }
  console.log('R450_AUTH_EMULATOR_BOUNDARY_PASS ' + JSON.stringify({
    checks: checks.length, sourceFiles: sourceFiles.length,
    projectId: PROJECT, signedServiceIdentityProven: false, releaseApproved: false,
  }));
} finally {
  if (serviceApp) await signOut(getClientAuth(serviceApp)).catch(() => {});
  if (ownerApp) await signOut(getClientAuth(ownerApp)).catch(() => {});
  if (serviceApp) await deleteClientApp(serviceApp).catch(() => {});
  if (ownerApp) await deleteClientApp(ownerApp).catch(() => {});
  if (otherProjectApp) await deleteAdminApp(otherProjectApp).catch(() => {});
  if (adminApp) await deleteAdminApp(adminApp).catch(() => {});
  rmSync(tmp, { force: true, recursive: true });
}
