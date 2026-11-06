// Supplemental THREE-emulator lifecycle + real Firebase callable HTTP wrappers.
// This is NOT a Functions emulator, R451 receipt, cloud IAM or release approval.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const project = 'urai-staging-test';
assert.equal(process.env.GCLOUD_PROJECT, project);
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN',
  'FIREBASE_DEBUG_MODE', 'FIREBASE_DEBUG_FEATURES', 'FUNCTIONS_EMULATOR']) {
  assert.ok(!process.env[key], `${key} forbidden: no cloud credentials or auth debug overrides`);
}
const require = createRequire(import.meta.url);
const deadline = setTimeout(() => { console.error('SYNTHETIC_HTTP_LIFECYCLE_TIMEOUT'); process.exit(1); }, 180000);
deadline.unref();
const express = require('express');
const admin = initializeAdminApp({ projectId: project, storageBucket: project + '.appspot.com' });
const handlers = await import('../lib/syntheticMemoryLifecycle.js');
const names = ['grantStagingSyntheticMemoryConsent', 'createStagingSyntheticMemory',
  'retrieveStagingSyntheticMemory', 'getStagingSyntheticLifeGraph', 'revokeStagingSyntheticMemoryConsent'];
const app = express();
app.use(express.json({ limit: '32kb' }));
for (const name of names) {
  assert.equal(typeof handlers[name], 'function');
  // Serve the actual onCall HTTP function, never .run(data, forgedContext).
  app.post('/' + project + '/us-central1/' + name, handlers[name]);
}
const server = await new Promise((resolve, reject) => {
  const listening = app.listen(5001, '127.0.0.1', () => resolve(listening));
  listening.once('error', reject);
});
const clients = [];
const runId = randomUUID().replaceAll('-', '');
const db = getFirestore(admin), bucket = getStorage(admin).bucket();
const checks = [];
const record = name => checks.push(name);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytesFor = id => Buffer.from('URAI_DISPOSABLE_SYNTHETIC_MEMORY:' + id);
const memory = (uid, id) => db.doc('staging_synthetic_memories/' + uid + '/items/' + id);
const graph = (uid, id) => db.doc('staging_synthetic_life_graph/' + uid + '/nodes/' + id);
const prefix = uid => 'staging_synthetic_memories/' + uid + '/';
const list = async uid => (await bucket.getFiles({ prefix: prefix(uid) }))[0];
function client(name) {
  const app = initializeApp({ apiKey: 'synthetic-emulator-api-key', projectId: project,
    appId: '1:123:web:synthetic', authDomain: project + '.firebaseapp.com' }, name + runId);
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return { auth, functions };
}
const call = async (client, name, data = {}) => (await httpsCallable(client.functions, name, { timeout: 30000 })(data)).data;
async function denied(name, promise) {
  await assert.rejects(promise, e => /functions\/(permission-denied|unauthenticated|invalid-argument)/.test(e.code));
  record(name);
}
try {
  const a = client('owner'), b = client('foreign'), guest = client('guest');
  const [ua, ub] = await Promise.all([a, b].map((c, i) => createUserWithEmailAndPassword(c.auth,
    `http-${runId}-${i}@example.test`, 'Disposable-Synthetic-Only-2026')));
  const uid = ua.user.uid, other = ub.user.uid;
  assert.notEqual(uid, other); record('real-auth-emulator-distinct-owner-identities');
  await denied('anonymous-consent-denied-by-actual-callable', call(guest, names[0], { purpose: 'memory.storage', confirmed: true }));
  const forged = await fetch('http://127.0.0.1:5001/' + project + '/us-central1/' + names[0], {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer not-a-token' },
    body: JSON.stringify({ data: { purpose: 'memory.storage', confirmed: true } }),
  });
  assert.equal(forged.status, 401); record('malformed-bearer-denied-by-real-sdk-auth-verifier');
  const consent = await call(a, names[0], { purpose: 'memory.storage', confirmed: true });
  assert.equal(consent.ownerUid, uid); assert.equal(consent.status, 'granted');
  record('authenticated-server-issued-consent');
  await denied('forged-consent-denied-before-storage', call(a, names[1], { decisionReceiptId: 'synthetic_receipt_forged1234' }));
  assert.equal((await list(uid)).length, 0); record('forged-consent-left-no-storage-bytes');
  const first = await call(a, names[1], { decisionReceiptId: consent.decisionReceiptId });
  const child = await call(a, names[1], { decisionReceiptId: consent.decisionReceiptId, relatedMemoryId: first.memoryId });
  const read = async (who = a) => call(who, names[2], { ownerUid: uid, memoryId: child.memoryId });
  const replay = await read();
  assert.equal(Buffer.from(replay.mediaBase64, 'base64').toString(), bytesFor(child.memoryId).toString());
  assert.equal(replay.sourceSha256, sha(bytesFor(child.memoryId))); record('actual-source-provenance-and-protected-byte-retrieval');
  assert.equal((await call(a, names[3], { ownerUid: uid })).nodes.length, 2); record('real-firestore-linked-life-graph');
  await denied('foreign-owner-replay-denied', read(b));
  await denied('foreign-owner-graph-denied', call(b, names[3], { ownerUid: uid }));
  const sourceRef = memory(uid, first.memoryId), saved = (await sourceRef.get()).data();
  await sourceRef.update({ sourceSha256: 'f'.repeat(64) });
  await denied('changed-ancestor-provenance-denies-child-replay', read());
  await sourceRef.set(saved);
  assert.equal((await read()).sourceSha256, child.sourceSha256); record('restored-ancestor-remains-readable');
  const otherConsent = await call(b, names[0], { purpose: 'memory.storage', confirmed: true });
  const otherMemory = await call(b, names[1], { decisionReceiptId: otherConsent.decisionReceiptId });
  const template = (await memory(uid, first.memoryId).get()).data();
  const graphTemplate = (await graph(uid, first.memoryId).get()).data();
  // Synthetic admin fixtures extend the inventory to 251 memory+graph pairs.
  // This exercises the real multi-batch deletion path (502 document deletes).
  for (let start = 0; start < 249; start += 100) {
    const batch = db.batch();
    for (let i = start; i < Math.min(start + 100, 249); i++) {
      const id = 'http_fixture_' + String(i).padStart(6, '0'), bytes = bytesFor(id);
      batch.create(memory(uid, id), { ...template, memoryId: id, relatedMemoryId: null,
        sourceSha256: sha(bytes), byteLength: bytes.length, storagePath: prefix(uid) + id + '.bin' });
      batch.create(graph(uid, id), { ...graphTemplate, memoryId: id, relatesTo: null, sourceSha256: sha(bytes) });
    }
    await batch.commit();
  }
  // Real untracked Storage bytes from a hypothetical interrupted admission.
  for (let start = 0; start < 252; start += 16) {
    await Promise.all(Array.from({ length: Math.min(16, 252 - start) }, (_, i) =>
      bucket.file(prefix(uid) + 'orphan_' + String(start + i).padStart(6, '0') + '.bin')
        .save(Buffer.from('SYNTHETIC_ORPHAN'), { resumable: false })));
  }
  assert.equal((await memory(uid, first.memoryId).parent.get()).size, 251);
  assert.equal((await list(uid)).length, 254); record('real-251-record-and-252-orphan-fixture');
  await denied('foreign-consent-receipt-cannot-revoke-owner', call(b, names[4], { decisionReceiptId: consent.decisionReceiptId }));
  const result = await call(a, names[4], { decisionReceiptId: consent.decisionReceiptId });
  assert.equal(result.deletedMemoryCount, 251); assert.equal(result.orphanStorageObjectCount, 252);
  assert.equal(result.storageCleared, true); assert.equal(result.graphCleared, true);
  assert.equal((await list(uid)).length, 0); record('actual-revocation-deletes-all-owner-bytes-and-orphans');
  assert.equal((await memory(uid, first.memoryId).parent.get()).empty, true);
  assert.equal((await graph(uid, first.memoryId).parent.get()).empty, true);
  assert.equal((await db.doc('staging_synthetic_memory_consents/' + uid).get()).get('cleanupComplete'), true);
  record('real-multi-batch-record-deletion-and-cleanup-ack');
  await denied('revoked-memory-replay-denied', read());
  await denied('revoked-consent-cannot-create-memory', call(a, names[1], { decisionReceiptId: consent.decisionReceiptId }));
  await denied('revocation-sticky-regrant-denied', call(a, names[0], { purpose: 'memory.storage', confirmed: true }));
  const otherReplay = await call(b, names[2], { ownerUid: other, memoryId: otherMemory.memoryId });
  assert.equal(otherReplay.sourceSha256, otherMemory.sourceSha256);
  assert.equal((await list(other)).length, 1); record('other-owner-bytes-and-consent-preserved');
  const repeat = await call(a, names[4], { decisionReceiptId: consent.decisionReceiptId });
  assert.equal(repeat.deletedMemoryCount, 0); assert.equal(repeat.orphanStorageObjectCount, 0);
  record('repeated-revocation-idempotent');
  const receipt = { schema: 'urai-synthetic-three-emulator-callable-http-v1',
    source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    checksPassed: checks.length, checks,
    actualFirebaseEmulators: ['Authentication', 'Firestore', 'Storage'],
    actualCallableHttpWrappers: true, functionsEmulatorExecuted: false,
    mockedSDKsOrContext: false, authVerificationDebugOverride: false,
    cloudCryptoOrIAMVerified: false, fullCrossServiceIntegration: false,
    productionAuthorized: false, releaseAccepted: false };
  console.log('THREE_EMULATOR_CALLABLE_HTTP_PASS ' + JSON.stringify(receipt));
} finally {
  await Promise.all(clients.map(deleteApp));
  await deleteAdminApp(admin);
  await new Promise(resolve => server.close(resolve));
  clearTimeout(deadline);
}
