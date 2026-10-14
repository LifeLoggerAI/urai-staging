// Staging-only, emulator-only real-service lifecycle probe. Never admit user
// uploads or substitute this synthetic source for an UrAi private memory.
import { createHash } from 'node:crypto';
import * as functions from 'firebase-functions/v1';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { requireAuth } from './lib/auth';
import { assertPlainObject, requiredString } from './lib/validation';

const purpose = 'memory.storage';
const policyVersion = 'urai-staging-synthetic-lifecycle-v1';
const project = 'urai-staging-test';
const bucketName = project + '.appspot.com';
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const deny = (message: string): never => { throw new functions.https.HttpsError('permission-denied', message); };
const invalid = (message: string): never => { throw new functions.https.HttpsError('invalid-argument', message); };

function ensureDisposableEmulator() {
  if (process.env.GCLOUD_PROJECT !== project ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
      process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199') {
    throw new functions.https.HttpsError('failed-precondition', 'SYNTHETIC_EMULATOR_ONLY');
  }
}
function uidFrom(context: functions.https.CallableContext): string {
  ensureDisposableEmulator();
  return requireAuth(context).uid;
}
function consentRef(uid: string) { return getFirestore().doc('staging_synthetic_memory_consents/' + uid); }
function memoryRef(uid: string, id: string) { return getFirestore().doc('staging_synthetic_memories/' + uid + '/items/' + id); }
function graphRef(uid: string, id: string) { return getFirestore().doc('staging_synthetic_life_graph/' + uid + '/nodes/' + id); }
function memoryBucket() { return getStorage().bucket(bucketName); }
function assertCurrentConsent(row: FirebaseFirestore.DocumentData | undefined, now = Date.now()): FirebaseFirestore.DocumentData {
  if (!row || row.ownerUid === undefined || row.purpose !== purpose ||
    row.policyVersion !== policyVersion || row.status !== 'granted' ||
    typeof row.decisionReceiptId !== 'string' || !/^synthetic_receipt_[A-Za-z0-9_-]{8,120}$/.test(row.decisionReceiptId) ||
    typeof row.expiresAtMillis !== 'number' || !Number.isSafeInteger(row.expiresAtMillis) ||
    row.expiresAtMillis <= now) throw new functions.https.HttpsError('permission-denied', 'SYNTHETIC_MEMORY_CONSENT_MISSING_REVOKED_OR_EXPIRED');
  return row;
}
function assertOwner(input: Record<string, unknown>, uid: string) {
  if (input.ownerUid !== uid) deny('SYNTHETIC_MEMORY_OWNER_DENIED');
}
function validatedMemoryId(input: Record<string, unknown>): string {
  const id = requiredString(input.memoryId, 'memoryId', 128);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) invalid('INVALID_SYNTHETIC_MEMORY_ID');
  return id;
}
function strict(input: unknown, keys: string[]): Record<string, unknown> {
  const data = assertPlainObject(input, 'syntheticLifecycleData');
  if (Object.keys(data).some(key => !keys.includes(key))) invalid('UNEXPECTED_SYNTHETIC_MEMORY_INPUT');
  return data;
}
function fixedBytes(id: string): Buffer {
  return Buffer.from('URAI_DISPOSABLE_SYNTHETIC_MEMORY:' + id, 'utf8');
}

export const grantStagingSyntheticMemoryConsent = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['purpose', 'confirmed']);
  if (input.purpose !== purpose || input.confirmed !== true) invalid('EXPLICIT_MEMORY_CONSENT_REQUIRED');
  const receipt = 'synthetic_receipt_' + getFirestore().collection('_nonpersistent_ids').doc().id;
  await getFirestore().runTransaction(async tx => {
    const ref = consentRef(uid);
    const current = await tx.get(ref);
    // Revoked consent is sticky in this probe: regrant never revives deleted
    // sources or cached graph links. Use another synthetic test identity.
    if (current.exists && current.get('status') !== 'granted') deny('SYNTHETIC_CONSENT_REVOCATION_STICKY');
    if (current.exists) deny('SYNTHETIC_CONSENT_ALREADY_GRANTED');
    tx.create(ref, {
      ownerUid: uid, purpose, policyVersion, decisionReceiptId: receipt,
      status: 'granted', revision: 1, synthetic: true,
      expiresAtMillis: Date.now() + 10 * 60 * 1000,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { status: 'granted', ownerUid: uid, purpose, policyVersion, decisionReceiptId: receipt, synthetic: true };
});

export const createStagingSyntheticMemory = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['decisionReceiptId', 'relatedMemoryId']);
  const receipt = requiredString(input.decisionReceiptId, 'decisionReceiptId', 160);
  const relation = input.relatedMemoryId === undefined ? null :
    requiredString(input.relatedMemoryId, 'relatedMemoryId', 128);
  if (relation !== null && !/^[A-Za-z0-9_-]{6,128}$/.test(relation)) invalid('INVALID_RELATION');
  const db = getFirestore();
  const id = db.collection('staging_synthetic_memories').doc().id;
  const filePath = 'staging_synthetic_memories/' + uid + '/' + id + '.bin';
  const content = fixedBytes(id);
  const digest = sha(content);
  const storage = memoryBucket().file(filePath);
  // No caller-supplied bytes. An actual Storage emulator object is persisted.
  await storage.save(content, { resumable: false, metadata: {
    contentType: 'application/octet-stream',
    metadata: { synthetic: 'true', ownerUid: uid, sourceSha256: digest },
  } });
  try {
    await db.runTransaction(async tx => {
      const consent = assertCurrentConsent((await tx.get(consentRef(uid))).data());
      if (consent.ownerUid !== uid || consent.decisionReceiptId !== receipt) deny('SYNTHETIC_CONSENT_RECEIPT_MISMATCH');
      if (relation !== null) {
        const linked = await tx.get(memoryRef(uid, relation));
        if (!linked.exists || linked.get('state') !== 'ACTIVE' ||
          linked.get('decisionReceiptId') !== receipt) deny('SYNTHETIC_GRAPH_SOURCE_UNAVAILABLE');
      }
      tx.create(memoryRef(uid, id), {
        ownerUid: uid, memoryId: id, state: 'ACTIVE', synthetic: true,
        purpose, policyVersion, decisionReceiptId: receipt,
        sourceEvidenceClass: 'SYNTHETIC_TEST_ONLY',
        sourceSha256: digest, byteLength: content.length,
        storagePath: filePath, relatedMemoryId: relation,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(graphRef(uid, id), {
        ownerUid: uid, memoryId: id, relatesTo: relation,
        sourceSha256: digest, decisionReceiptId: receipt,
        synthetic: true, state: 'ACTIVE',
      });
    });
  } catch (error) {
    await storage.delete({ignoreNotFound:true}).catch(() => {});
    throw error;
  }
  return { memoryId: id, ownerUid: uid, sourceSha256: digest, synthetic: true };
});

export const retrieveStagingSyntheticMemory = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['ownerUid', 'memoryId']);
  assertOwner(input, uid);
  const id = validatedMemoryId(input);
  const db = getFirestore();
  const first = await db.runTransaction(async tx => {
    const [c, m, g] = await Promise.all([
      tx.get(consentRef(uid)), tx.get(memoryRef(uid, id)), tx.get(graphRef(uid, id)),
    ]);
    const consent = assertCurrentConsent(c.data());
    const row = m.data();
    if (!row) throw new functions.https.HttpsError('permission-denied', 'SYNTHETIC_MEMORY_UNAVAILABLE');
    if (!m.exists || !g.exists || row.ownerUid !== uid ||
      row.state !== 'ACTIVE' || row.synthetic !== true ||
      row.sourceEvidenceClass !== 'SYNTHETIC_TEST_ONLY' ||
      row.decisionReceiptId !== consent.decisionReceiptId ||
      g.get('sourceSha256') !== row.sourceSha256 ||
      g.get('decisionReceiptId') !== consent.decisionReceiptId) deny('SYNTHETIC_MEMORY_UNAVAILABLE');
    return { sourceSha256: String(row.sourceSha256), storagePath: String(row.storagePath),
      receipt: String(consent.decisionReceiptId), byteLength: Number(row.byteLength) };
  });
  const expectedPath = 'staging_synthetic_memories/' + uid + '/' + id + '.bin';
  if (first.storagePath !== expectedPath || !/^[0-9a-f]{64}$/.test(first.sourceSha256) ||
    first.byteLength > 256 || first.byteLength < 1) deny('SYNTHETIC_MEMORY_PROVENANCE_INVALID');
  const [bytes] = await memoryBucket().file(expectedPath).download();
  if (bytes.length !== first.byteLength || sha(bytes) !== first.sourceSha256 ||
    !bytes.equals(fixedBytes(id))) deny('SYNTHETIC_MEMORY_FIXITY_FAILED');
  // Check state again after actual media access. Revocation is a server-side
  // consent fence; cached or previously returned bytes are NOT under our control.
  await db.runTransaction(async tx => {
    const [c, m] = await Promise.all([tx.get(consentRef(uid)), tx.get(memoryRef(uid, id))]);
    const consent = assertCurrentConsent(c.data());
    if (consent.decisionReceiptId !== first.receipt || !m.exists ||
      m.get('state') !== 'ACTIVE' || m.get('sourceSha256') !== first.sourceSha256) {
      deny('SYNTHETIC_MEMORY_REVOKED_DURING_READ');
    }
  });
  return { ownerUid: uid, memoryId: id, synthetic: true,
    sourceSha256: first.sourceSha256, mediaBase64: bytes.toString('base64') };
});

export const getStagingSyntheticLifeGraph = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['ownerUid']);
  assertOwner(input, uid);
  const db = getFirestore();
  const before = assertCurrentConsent((await consentRef(uid).get()).data());
  const nodes = await db.collection('staging_synthetic_life_graph').doc(uid).collection('nodes').get();
  const after = assertCurrentConsent((await consentRef(uid).get()).data());
  if (before.decisionReceiptId !== after.decisionReceiptId) deny('SYNTHETIC_GRAPH_CONSENT_CHANGED');
  const out = nodes.docs.map(x => x.data()).filter(x =>
    x.ownerUid === uid && x.synthetic === true &&
    x.state === 'ACTIVE' && x.decisionReceiptId === after.decisionReceiptId);
  if (out.length !== nodes.size) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
  return { ownerUid: uid, synthetic: true, nodes: out.map(x => ({
    memoryId: x.memoryId, relatesTo: x.relatesTo, sourceSha256: x.sourceSha256,
  })) };
});

export const revokeStagingSyntheticMemoryConsent = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['decisionReceiptId']);
  const receipt = requiredString(input.decisionReceiptId, 'decisionReceiptId', 160);
  const db = getFirestore(), ref = consentRef(uid);
  await db.runTransaction(async tx => {
    const c = await tx.get(ref);
    if (!c.exists || c.get('ownerUid') !== uid || c.get('decisionReceiptId') !== receipt) {
      deny('SYNTHETIC_CONSENT_RECEIPT_MISMATCH');
    }
    tx.update(ref, { status: 'revoked', revision: FieldValue.increment(1),
      revokedAt: FieldValue.serverTimestamp(), cleanupComplete: false });
  });
  // Consent revokes access BEFORE deleting any bytes. If cleanup fails, the
  // next invocation retries; reads stay denied while a retry is outstanding.
  const docs = await db.collection('staging_synthetic_memories').doc(uid).collection('items').get();
  const batch = db.batch();
  let removed = 0;
  for (const item of docs.docs) {
    const row = item.data();
    if (row.ownerUid !== uid || row.storagePath !== 'staging_synthetic_memories/' + uid + '/' + item.id + '.bin') {
      deny('SYNTHETIC_CLEANUP_SOURCE_MISMATCH');
    }
    await memoryBucket().file(row.storagePath).delete({ignoreNotFound:true});
    batch.delete(item.ref);
    batch.delete(graphRef(uid, item.id));
    removed++;
  }
  if (removed) await batch.commit();
  const orphanGraph = await db.collection('staging_synthetic_life_graph').doc(uid).collection('nodes').get();
  if (!orphanGraph.empty) deny('SYNTHETIC_GRAPH_CLEANUP_INCOMPLETE');
  await ref.update({cleanupComplete: true});
  return { status: 'revoked', ownerUid: uid, deletedMemoryCount: removed, graphCleared: true, synthetic: true };
});
