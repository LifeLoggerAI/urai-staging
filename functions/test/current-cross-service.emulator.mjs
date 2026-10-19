// Actual SDK + Firebase emulators only. Not real cloud deployment or token
// revocation propagation. Data is confined to a disposable synthetic project.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut, getIdToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getMetadata, deleteObject } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const expectedProject = 'urai-staging-test';
const requiredEmulators = [
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
  'FIREBASE_FUNCTIONS_EMULATOR_HOST',
];
assert.equal(process.env.URAI_EMULATOR_PROJECT, expectedProject, 'Not the disposable synthetic Firebase project');
for (const key of requiredEmulators) {
  assert.ok(process.env[key]?.startsWith('127.0.0.1:'), 'Missing loopback Firebase emulator: ' + key);
}
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', '', 'Real cloud credentials forbidden');
assert.equal(process.env.FIREBASE_TOKEN || '', '', 'Firebase deployment token forbidden');

const projectConfig = {
  apiKey: 'synthetic-emulator-api-key',
  authDomain: expectedProject + '.firebaseapp.com',
  projectId: expectedProject,
  storageBucket: expectedProject + '.appspot.com',
  appId: '1:123456789:web:syntheticemulatortest',
};
const apps = [];
const checks = [];
const record = label => checks.push(label);
async function mustDeny(label, promise) {
  let denied;
  try { await promise; }
  catch (error) { denied = error; }
  assert.ok(denied, label + ': operation was permitted');
  assert.match(String(denied.code || denied.message || denied), /permission-denied|unauthenticated|invalid-argument|storage\/unauthorized|storage\/unauthenticated/i, label);
  record(label);
}
function client(name) {
  const app = initializeApp(projectConfig, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return { app, auth, firestore, storage, functions };
}

const a = client('test-owner');
const b = client('test-tenant');
const admin = client('test-admin');
const guest = client('test-guest');
const server = initializeAdminApp({ projectId: expectedProject }, 'cross-service-emulator-admin');
const key = 'Synthetic-only-not-a-credential-2026';
const bytes = new Uint8Array([85, 114, 65, 105, 0, 42]);
const ownerPath = 'staging_users/';
const call = (ctx, functionName, data = {}) => httpsCallable(ctx.functions, functionName)(data);
try {
  const [ua, ub, uc] = await Promise.all([
    createUserWithEmailAndPassword(a.auth, 'cross-owner@example.test', key),
    createUserWithEmailAndPassword(b.auth, 'cross-other@example.test', key),
    createUserWithEmailAndPassword(admin.auth, 'cross-admin@example.test', key),
  ]);
  assert.ok(ua.user.uid && ub.user.uid && uc.user.uid);
  assert.notEqual(ua.user.uid, ub.user.uid);
  record('real-emulated-auth-signup-three-distinct-users');

  const health = (await call(a, 'authenticatedHealthCheck')).data;
  assert.equal(health.uid, ua.user.uid);
  record('auth-token-propagated-through-functions-emulator');

  await mustDeny('missing-custom-admin-claim-denied', call(a, 'adminHealthCheck'));
  await mustDeny('unauthenticated-callable-denied', call(guest, 'authenticatedHealthCheck'));

  const ownerDoc = doc(a.firestore, 'staging_users', ua.user.uid);
  await setDoc(ownerDoc, { displayName: 'Synthetic Owner' });
  assert.equal((await getDoc(ownerDoc)).data()?.displayName, 'Synthetic Owner');
  await mustDeny('firestore-cross-owner-denied', getDoc(doc(b.firestore, 'staging_users', ua.user.uid)));
  await mustDeny('firestore-owner-spoofing-denied',
    setDoc(doc(b.firestore, 'staging_users', ua.user.uid), { displayName: 'No' }));
  record('firestore-owner-write-and-read');

  const privateFile = ownerPath + ua.user.uid + '/synthetic-private-memory.bin';
  const owned = ref(a.storage, privateFile);
  await uploadBytes(owned, bytes, { contentType: 'application/octet-stream' });
  assert.equal((await getMetadata(owned)).size, bytes.length);
  await mustDeny('storage-cross-tenant-read-denied', getMetadata(ref(b.storage, privateFile)));
  await mustDeny('storage-cross-tenant-delete-denied', deleteObject(ref(b.storage, privateFile)));
  await mustDeny('storage-anonymous-read-denied', getMetadata(ref(guest.storage, privateFile)));
  record('storage-owner-private-upload');

  await mustDeny('ordinary-user-job-admission-denied', call(a, 'createStagingJob', {
    kind: 'synthetic-contract', payload: { approvedMedia: false },
  }));
  await mustDeny('ordinary-user-feature-flag-write-denied', call(a, 'setFeatureFlag', {
    flag: 'synthetic-consent', enabled: true,
  }));

  // Only emulator-scoped Admin SDK sets the simulated custom claim; no cloud
  // privilege or IAM mutation occurs.
  await getAdminAuth(server).setCustomUserClaims(uc.user.uid, { role: 'admin' });
  await getIdToken(uc.user, true);
  const adminHealth = (await call(admin, 'adminHealthCheck')).data;
  assert.equal(adminHealth.uid, uc.user.uid);
  assert.equal(adminHealth.role, 'admin');
  record('admin-custom-claim-emulated-functions-authorization');

  const feature = (await call(admin, 'setFeatureFlag', {
    flag: 'synthetic-consent', enabled: false,
  })).data;
  assert.equal(feature.status, 'updated');
  const readFeature = (await call(a, 'getFeatureFlag', { flag: 'synthetic-consent' })).data;
  assert.equal(readFeature.enabled, false);
  record('admin-write-and-user-read-shared-firestore-function-state');

  const queue = (await call(admin, 'createStagingJob', {
    kind: 'synthetic-contract', payload: { permittedMedia: false },
  })).data;
  assert.equal(queue.status, 'queued');
  await mustDeny('job-firestore-owner-without-admin-claim-denied',
    getDoc(doc(a.firestore, 'staging_jobs', queue.jobId)));
  assert.equal((await getDoc(doc(admin.firestore, 'staging_jobs', queue.jobId))).data()?.status, 'queued');
  record('staging-job-admin-only-service-boundary');

  const receipt = (await call(a, 'recordStagingEvent', {
    type: 'synthetic.consent.event',
    payload: { permittedMedia: false },
  })).data;
  assert.ok(receipt.eventId);
  await mustDeny('private-event-client-read-denied',
    getDoc(doc(a.firestore, 'staging_events', receipt.eventId)));
  record('authenticated-event-functions-writes-not-client-readable');

  // Real Firebase SDK -> Functions -> Firestore transaction -> Storage
  // lifecycle, using fixed synthetic bytes only. This is an isolated
  // emulator-only proof, not certified production Life Graph or provider work.
  await mustDeny('memory-missing-consent-denied',
    call(a, 'createStagingSyntheticMemory', { decisionReceiptId: 'synthetic_receipt_invalid1234' }));
  await mustDeny('memory-unauthenticated-consent-denied',
    call(guest, 'grantStagingSyntheticMemoryConsent', { purpose: 'memory.storage', confirmed: true }));
  await mustDeny('memory-explicit-consent-required',
    call(a, 'grantStagingSyntheticMemoryConsent', { purpose: 'memory.storage', confirmed: false }));
  const granted = (await call(a, 'grantStagingSyntheticMemoryConsent', {
    purpose: 'memory.storage', confirmed: true,
  })).data;
  assert.equal(granted.status, 'granted');
  assert.equal(granted.synthetic, true);
  const grantReceipt = granted.decisionReceiptId;
  assert.match(grantReceipt, /^synthetic_receipt_/);
  record('memory-consent-receipt-created-in-firestore-service');

  await mustDeny('memory-forged-consent-receipt-denied',
    call(a, 'createStagingSyntheticMemory', { decisionReceiptId: 'synthetic_receipt_invalid1234' }));
  await mustDeny('memory-second-grant-denied',
    call(a, 'grantStagingSyntheticMemoryConsent', { purpose: 'memory.storage', confirmed: true }));

  const firstMemory = (await call(a, 'createStagingSyntheticMemory', {
    decisionReceiptId: grantReceipt,
  })).data;
  assert.equal(firstMemory.ownerUid, ua.user.uid);
  assert.match(firstMemory.sourceSha256, /^[a-f0-9]{64}$/);
  const secondMemory = (await call(a, 'createStagingSyntheticMemory', {
    decisionReceiptId: grantReceipt, relatedMemoryId: firstMemory.memoryId,
  })).data;
  const graph = (await call(a, 'getStagingSyntheticLifeGraph', {
    ownerUid: ua.user.uid,
  })).data;
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.nodes.find(n => n.memoryId === secondMemory.memoryId)?.relatesTo, firstMemory.memoryId);
  record('memory-real-firestore-life-graph-relationship-created');

  const retrieval = (await call(a, 'retrieveStagingSyntheticMemory', {
    ownerUid: ua.user.uid, memoryId: firstMemory.memoryId,
  })).data;
  const actual = Buffer.from(retrieval.mediaBase64, 'base64');
  assert.equal(actual.toString('utf8'), 'URAI_DISPOSABLE_SYNTHETIC_MEMORY:' + firstMemory.memoryId);
  assert.equal(retrieval.sourceSha256, firstMemory.sourceSha256);
  record('memory-permissioned-retrieval-actual-storage-fixity');

  await mustDeny('memory-cross-user-retrieval-denied',
    call(b, 'retrieveStagingSyntheticMemory', {
      ownerUid: ua.user.uid, memoryId: firstMemory.memoryId,
    }));
  await mustDeny('memory-cross-user-graph-denied',
    call(b, 'getStagingSyntheticLifeGraph', { ownerUid: ua.user.uid }));
  await mustDeny('memory-direct-client-firestore-denied',
    getDoc(doc(a.firestore, 'staging_synthetic_memories', ua.user.uid, 'items', firstMemory.memoryId)));
  await mustDeny('memory-direct-client-storage-denied',
    getMetadata(ref(a.storage, 'staging_synthetic_memories/' + ua.user.uid + '/' + firstMemory.memoryId + '.bin')));

  const revoked = (await call(a, 'revokeStagingSyntheticMemoryConsent', {
    decisionReceiptId: grantReceipt,
  })).data;
  assert.equal(revoked.status, 'revoked');
  assert.equal(revoked.deletedMemoryCount, 2);
  assert.equal(revoked.graphCleared, true);
  record('memory-revocation-before-storage-deletion-and-graph-cleanup');
  await mustDeny('memory-retrieval-after-revocation-denied',
    call(a, 'retrieveStagingSyntheticMemory', {
      ownerUid: ua.user.uid, memoryId: firstMemory.memoryId,
    }));
  await mustDeny('memory-graph-after-revocation-denied',
    call(a, 'getStagingSyntheticLifeGraph', { ownerUid: ua.user.uid }));
  await mustDeny('memory-new-ingestion-after-revocation-denied',
    call(a, 'createStagingSyntheticMemory', { decisionReceiptId: grantReceipt }));
  await mustDeny('memory-consent-regrant-sticky-denied',
    call(a, 'grantStagingSyntheticMemoryConsent', { purpose: 'memory.storage', confirmed: true }));

  await deleteObject(owned);
  await deleteDoc(ownerDoc);
  record('synthetic-owner-storage-and-firestore-deletion');

  await signOut(a.auth);
  await mustDeny('signed-out-session-private-storage-denied', getMetadata(ref(a.storage, privateFile)));
  await mustDeny('signed-out-session-callable-denied', call(a, 'authenticatedHealthCheck'));
  record('client-signout-observed-not-server-token-revocation');

  const output = {
    schemaVersion: 'urai-current-cross-service-emulator-1',
    environment: 'disposable-firebase-emulators-only',
    projectId: expectedProject,
    exactStagingSource: process.env.TARGET_SHA || 'unknown',
    testsPassed: checks.length,
    evidence: checks,
    realEmulatorServices: ['Authentication', 'Firestore', 'Storage', 'Functions'],
    syntheticFixturesOnly: true,
    cloudAuthenticated: false,
    cloudStagingDeployed: false,
    crossRepoSourceTestsRunSeparately: true,
    jobsWorkerAndPrivacyRuntimeServiceIntegrated: false,
    revocationServerPropagationVerified: false,
    productionAccessOrSpending: false,
    finalReleaseAccepted: false,
  };
  assert.ok(process.env.URAI_CROSS_SERVICE_RECEIPT, 'Receipt path required');
  writeFileSync(process.env.URAI_CROSS_SERVICE_RECEIPT, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', projectId: expectedProject, testsPassed: checks.length }));
} finally {
  await Promise.allSettled([signOut(a.auth), signOut(b.auth), signOut(admin.auth)]);
  for (const app of apps) await deleteApp(app).catch(() => {});
  await deleteAdminApp(server).catch(() => {});
}
