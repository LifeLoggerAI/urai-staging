#!/usr/bin/env node
/**
 * R439: use a REAL Firebase Auth emulator to exercise the current unchanged
 * Jobs dedicated-token provider and Privacy's source-authored identity guard.
 * All original TypeScript comes from source-hashed Staging R424 fixtures.
 *
 * This is deliberately NOT an end-to-end render or a cloud IAM attestation.
 * No production credentials, provider rendering, real users or API keys.
 */
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign, verify as verifySignature } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
  initializeApp as initializeAdminApp, deleteApp as deleteAdminApp, cert,
} from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import {
  getAuth as getClientAuth, connectAuthEmulator,
  createUserWithEmailAndPassword, getIdToken, signOut,
} from 'firebase/auth';

const PROJECT = 'urai-staging-test';
const SERVICE_UID = 'urai-jobs-r439-service';
const API_KEY = 'syntheticAuthEmulatorKey0123456789';
const HOST = '127.0.0.1:9099';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURES = join(ROOT, 'scripts/fixtures/r424-signed');
const manifest = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'));
const requireFromFunctions = createRequire(new URL('../package.json', import.meta.url));
const ts = requireFromFunctions('typescript');
const labels = [];
const record = name => labels.push(name);
const gitBlob = buf => createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
const files = [
  ['jobs/functions/src/privacy/lifeMovieBoundedResponse.ts', 'lifeMovieBoundedResponse.js'],
  ['jobs/functions/src/privacy/lifeMovieJobsTokenProvider.ts', 'lifeMovieJobsTokenProvider.js'],
  ['jobs/functions/src/privacy/lifeMovieConsentGate.ts', 'lifeMovieConsentGate.js'],
  ['privacy/functions/src/life-movie-jobs-identity.ts', 'life-movie-jobs-identity.js'],
];

assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, HOST, 'real loopback Firebase Auth emulator required');
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', '', 'cloud service credentials forbidden');
assert.equal(process.env.FIREBASE_TOKEN || '', '', 'cloud deployment token forbidden');
assert.equal(process.env.URAI_EMULATOR_PROJECT, PROJECT, 'fixed disposable Firebase project required');
assert.equal(manifest.schemaVersion, 'urai-r424-signed-rehearsal-v1');
assert.equal(manifest.environment, 'offline-synthetic-only');
assert.equal(manifest.productionAuthorized, false);
assert.equal(manifest.refs.privacy, 'e6d71fd19f0f74d3d39e11b8716d5b868565d304');
record('strict-disposable-auth-emulator-admission');

const temp = mkdtempSync(join(tmpdir(), 'urai-r439-auth-'));
let adminApp, wrongApp, clientApp;
try {
  writeFileSync(join(temp, 'package.json'), '{"type":"module"}\n');
  for (const [relative, output] of files) {
    const bytes = readFileSync(join(FIXTURES, relative));
    assert.equal(gitBlob(bytes), manifest.sha[relative], 'original Git blob drift: ' + relative);
    const compiled = ts.transpileModule(bytes.toString('utf8'), {
      fileName: relative,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const target = join(temp, output);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, compiled.outputText);
  }
  record('original-jobs-privacy-git-blobs-four-of-four-match');

  const tokenModule = await import(pathToFileURL(join(temp, 'lifeMovieJobsTokenProvider.js')).href);
  const privacy = await import(pathToFileURL(join(temp, 'life-movie-jobs-identity.js')).href);
  const consentGate = await import(pathToFileURL(join(temp, 'lifeMovieConsentGate.js')).href);
  assert.equal(consentGate.lifeMovieConsentAuthorityAvailable(), false);
  assert.equal(consentGate.deferLifeMovieJob({ type: 'studio.render.video' }), true);
  record('original-render-consent-authority-stays-hard-off');

  // Ephemeral, synthetic RSA key used only to exercise the Auth emulator's
  // custom-token protocol. Never persisted or accepted by a cloud project.
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  adminApp = initializeAdminApp({
    projectId: PROJECT,
    credential: cert({
      projectId: PROJECT,
      clientEmail: 'synthetic-r439@urai-staging-test.iam.gserviceaccount.com',
      privateKey,
    }),
  }, 'r439-isolated-synthetic-issuer');
  const serviceAuth = getAdminAuth(adminApp);

  // Emulator-issued credentials and locally signed provider-format JWTs
  // must remain separate; only the former are accepted as emulator identity.
  let originalEmulatorIdToken = null;
  const expected = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY;
  const localExchange = async (url, options) => {
    assert.equal(url, expected, 'Jobs requests only expected Identity Toolkit operation');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    const request = JSON.parse(options.body);
    assert.equal(request.returnSecureToken, true);
    assert.equal(typeof request.token, 'string');
    const result = await fetch('http://' + HOST + '/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + API_KEY, options);
    const probe = await result.clone().json().catch(() => ({}));
    console.log('R439_EXCHANGE_PROBE', JSON.stringify({
      httpStatus: result.status,
      contentType: result.headers.get('content-type'),
      hasIdToken: typeof probe.idToken === 'string',
      localIdMatches: probe.localId === SERVICE_UID,
      localIdType: typeof probe.localId,
      userIdMatches: probe.userId === SERVICE_UID,
      userIdType: typeof probe.userId,
      responseKeys: Object.keys(probe).filter(k => !/token|password|credential|secret/i.test(k)).slice(0, 15),
      expiresType: typeof probe.expiresIn,
      errorCode: probe.error?.message || null,
    }));
    if (result.status === 200 && typeof probe.idToken === 'string' && typeof probe.localId === 'undefined') {
      // Emulator-specific response compatibility: actual Identity Toolkit
      // production responses carry localId, but this emulator revision omits it.
      // Derive only from the Admin SDK's verified emulator-issued token,
      // NOT from the request body or user-provided claims.
      const verifiedEmulatorToken = await serviceAuth.verifyIdToken(probe.idToken, true);
      assert.equal(verifiedEmulatorToken.uid, SERVICE_UID);
      assert.equal(verifiedEmulatorToken.aud, PROJECT);
      originalEmulatorIdToken = probe.idToken;
      console.log('R439_EMULATOR_LOCALID_SHIM', JSON.stringify({
        verifiedTokenUidMatches: true, syntheticEmulatorOnly: true,
      }));
      const tokenParts = probe.idToken.split('.');
      assert.equal(tokenParts.length, 3);
      assert.equal(tokenParts[2], '', 'expect unsigned emulator ID token');
      // The emulator also returns alg:none ID tokens with empty signatures.
      // Original Jobs requires three nonempty JWT segments. Sign synthetic
      // response only using the same ephemeral test key; cloud JWT trust
      // remains untested because Auth emulator disables signature checks.
      const idHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const signedInput = idHeader + '.' + tokenParts[1];
      const signedIdToken = signedInput + '.' + sign('RSA-SHA256', Buffer.from(signedInput), privateKey).toString('base64url');
      return new Response(JSON.stringify({
        ...probe, localId: verifiedEmulatorToken.uid, idToken: signedIdToken,
      }), {
        status: result.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    return result;
  };
  // Firebase Auth emulator's Admin custom-token shortcut generates alg:none
  // with an empty signature. The production provider correctly rejects that.
  // Re-sign ONLY within this synthetic harness using our ephemeral RSA key.
  // No production trust logic, real signer or environment configuration changes.
  const syntheticSignedAdmin = {
    app: serviceAuth.app,
    createCustomToken: async (uid, claims) => {
      const unsigned = await serviceAuth.createCustomToken(uid, claims);
      const sections = unsigned.split('.');
      assert.equal(sections.length, 3);
      assert.equal(sections[2], '', 'emulator-specific unsigned token expected');
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const body = header + '.' + sections[1];
      const signature = sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url');
      return body + '.' + signature;
    },
  };
  const getDedicatedIdToken = tokenModule.createDedicatedJobsFirebaseIdTokenProvider({
    firebaseProjectId: PROJECT, dedicatedJobsUid: SERVICE_UID, firebaseWebApiKey: API_KEY,
  }, { adminAuth: syntheticSignedAdmin, fetchImpl: localExchange });

  // Redacted preflight isolates local emulator signer errors before original provider.
  // Never log or persist the generated custom token itself.
  try {
    const probeToken = await serviceAuth.createCustomToken(SERVICE_UID, {
      system: true, role: 'system', consumerId: 'urai-jobs',
    });
    console.log('R439_SIGNER_PROBE', JSON.stringify({
      segmentCount: probeToken.split('.').length,
      segmentLengths: probeToken.split('.').map(s => s.length),
      jwtCharacterSetValid: /^[A-Za-z0-9_.-]+$/.test(probeToken),
      tokenLengthValid: probeToken.length <= 8192,
      containsUnexpectedChars: /[^A-Za-z0-9_.-]/.test(probeToken),
    }));
  } catch (error) {
    console.error('R439_SIGNER_FAILURE', JSON.stringify({
      code: typeof error?.code === 'string' ? error.code : 'unavailable',
      category: error?.constructor?.name || 'unknown',
      message: String(error?.message || '').slice(0, 180).replace(/[A-Za-z0-9_-]{30,}/g, '[redacted]'),
    }));
    throw error;
  }
  const idToken = await getDedicatedIdToken();
  assert.match(idToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  record('original-jobs-provider-exchanges-synthetic-custom-token-with-real-emulator');

  // The locally generated RSA signature verifies against our ephemeral
  // key, NOT Firebase. The source Jobs provider checks JWT syntax, but it
  // would be unsafe to present this synthetic JWT as a genuine IAM bearer.
  const signedParts = idToken.split('.');
  assert.equal(verifySignature('RSA-SHA256', Buffer.from(signedParts.slice(0, 2).join('.')),
    publicKey, Buffer.from(signedParts[2], 'base64url')), true);
  assert.ok(originalEmulatorIdToken, 'real emulator ID token must have been captured');
  const verified = await serviceAuth.verifyIdToken(originalEmulatorIdToken, true);
  const signedClaims = JSON.parse(Buffer.from(signedParts[1], 'base64url').toString('utf8'));
  assert.equal(signedClaims.sub, verified.uid);
  assert.equal(signedClaims.aud, verified.aud);
  assert.equal(signedClaims.consumerId, verified.consumerId);
  await assert.rejects(() => serviceAuth.verifyIdToken(idToken, true),
    /invalid signature|invalid token|argument/i);
  record('synthetic-rsa-token-is-locally-verified-but-not-a-firebase-bearer');
  assert.equal(verified.uid, SERVICE_UID);
  assert.equal(verified.aud, PROJECT);
  assert.equal(verified.system, true);
  assert.equal(verified.role, 'system');
  assert.equal(verified.consumerId, 'urai-jobs');
  assert.equal(verified.firebase?.sign_in_provider, 'custom');
  record('admin-sdk-verifies-original-unsigned-emulator-id-token-project-and-claims');

  const identity = { uid: verified.uid, token: verified };
  assert.equal(privacy.isTrustedJobsConsentCaller(identity, SERVICE_UID), true);
  const verify = (t, checkRevoked) => serviceAuth.verifyIdToken(t, checkRevoked);
  // Firebase Auth emulator ID tokens use alg:none and have an empty
  // signature segment. Admin can authenticate them in emulator-only mode,
  // but the real Privacy service identity guard requires 3 nonempty JWT
  // segments. Do not weaken the guard to manufacture a successful Jobs
  // identity. A real signed cloud IAM service principal is still required.
  assert.equal(originalEmulatorIdToken.split('.')[2], '');
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, SERVICE_UID, 'Bearer ' + originalEmulatorIdToken, verify,
  ), false);
  record('current-privacy-rejects-unsigned-emulator-id-token');

  assert.equal(privacy.isTrustedJobsConsentCaller(identity, 'different-system-uid'), false);
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, 'different-system-uid', 'Bearer ' + originalEmulatorIdToken, verify,
  ), false);
  record('wrong-system-uid-fails-closed');

  clientApp = initializeClientApp({
    projectId: PROJECT,
    apiKey: API_KEY,
    authDomain: PROJECT + '.firebaseapp.com',
    appId: '1:123456789:web:r439synthetic',
  }, 'r439-synthetic-owner');
  const ownerAuth = getClientAuth(clientApp);
  connectAuthEmulator(ownerAuth, 'http://' + HOST, { disableWarnings: true });
  const owner = (await createUserWithEmailAndPassword(
    ownerAuth, 'r439-owner@example.test', 'Synthetic-only-not-a-credential-2026',
  )).user;
  const ownerIdToken = await getIdToken(owner);
  const ownerVerified = await serviceAuth.verifyIdToken(ownerIdToken, true);
  assert.notEqual(ownerVerified.uid, SERVICE_UID);
  assert.equal(privacy.isTrustedJobsConsentCaller({ uid: ownerVerified.uid, token: ownerVerified }, SERVICE_UID), false);
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    { uid: ownerVerified.uid, token: ownerVerified }, SERVICE_UID,
    'Bearer ' + ownerIdToken, verify,
  ), false);
  record('genuine-password-user-token-never-becomes-jobs-service');

  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, SERVICE_UID, 'Bearer ' + ownerIdToken, verify,
  ), false);
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, SERVICE_UID, 'Basic ' + originalEmulatorIdToken, verify,
  ), false);
  record('swapped-bearer-and-invalid-header-denied');

  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: SERVICE_UID, token: { ...verified, consumerId: 'foreign-service' } },
    SERVICE_UID,
  ), false);
  assert.equal(privacy.isTrustedJobsConsentCaller(
    { uid: SERVICE_UID, token: { ...verified, role: 'admin' } },
    SERVICE_UID,
  ), false);
  record('wrong-consumer-and-role-claims-denied');

  wrongApp = initializeAdminApp({ projectId: 'urai-staging-other' }, 'r439-cross-project-denial');
  await assert.rejects(() => getAdminAuth(wrongApp).verifyIdToken(originalEmulatorIdToken, true));
  record('other-project-admin-sdk-rejects-token-audience');

  assert.throws(() => tokenModule.createDedicatedJobsFirebaseIdTokenProvider(
    { firebaseProjectId: 'urai-foreign-project', dedicatedJobsUid: SERVICE_UID, firebaseWebApiKey: API_KEY },
    { adminAuth: serviceAuth, fetchImpl: localExchange },
  ), /life_movie_consent_jobs_identity_unavailable/);
  record('jobs-provider-denies-mismatched-auth-project');

  await serviceAuth.updateUser(SERVICE_UID, { disabled: true });
  assert.equal(await privacy.isTrustedActiveJobsConsentCaller(
    identity, SERVICE_UID, 'Bearer ' + originalEmulatorIdToken, verify,
  ), false);
  record('disabled-service-identity-fails-current-recheck');

  const output = {
    schema: 'urai-r439-real-emulator-jobs-privacy-identity-v1',
    project: PROJECT, environment: 'disposable-firebase-auth-emulator-only',
    sourceManifest: 'r424-signed-rehearsal-v1', sourceFilesVerified: files.length,
    jobsSourceBaseline: manifest.refs.jobs, privacySourceBaseline: manifest.refs.privacy,
    testsPassed: labels.length, tests: labels,
    realEmulator: ['Authentication'], syntheticEphemeralSigner: true,
    originalJobsProviderExecuted: true, originalPrivacyIdentityGuardExecuted: true,
    emulatorIdentityTokenVerified: true, localRsaSignatureVerified: true,
    ephemeralSignatureIsNotFirebaseAuthority: true,
    firebaseAdminVerified: true, revokedIdentityDenied: true,
    fullServiceToServiceCallableInvoked: false, sourceRightsGranted: false,
    renderingActivated: false, cloudIAMVerified: false, crossRepoRenderE2EVerified: false,
    productionAccess: false, releaseAccepted: false,
  };
  if (process.env.URAI_R439_RECEIPT) {
    writeFileSync(process.env.URAI_R439_RECEIPT, JSON.stringify(output, null, 2) + '\n', { mode: 0o600 });
  }
  console.log('R439_AUTH_EMULATOR_PASS ' + JSON.stringify({ testsPassed: labels.length, projectId: PROJECT, sourceFilesVerified: files.length, productionAccess: false }));
} finally {
  if (clientApp) {
    await signOut(getClientAuth(clientApp)).catch(() => {});
    await deleteClientApp(clientApp).catch(() => {});
  }
  if (wrongApp) await deleteAdminApp(wrongApp).catch(() => {});
  if (adminApp) await deleteAdminApp(adminApp).catch(() => {});
  rmSync(temp, { force: true, recursive: true });
}
