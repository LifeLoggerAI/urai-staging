// Staging-only, emulator-only real-service lifecycle probe. Never admit user
// uploads or substitute this synthetic source for an UrAi private memory.
import { createHash } from 'node:crypto';
import * as functions from 'firebase-functions/v1';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { requireAuth } from './lib/auth';
import { assertPlainObject, requiredString } from './lib/validation';
import { sweepSyntheticStorageResidue } from './syntheticStorageResidue';

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
function assertCurrentConsent(row: FirebaseFirestore.DocumentData | undefined, ownerUid: string, now = Date.now()): FirebaseFirestore.DocumentData {
  if (!row || row.ownerUid !== ownerUid || row.purpose !== purpose ||
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
// Bind direct Replay reads to the same parent/child source relationship that
// Life Graph listing validates. Read the parent inside each consent transaction:
// a revoked or changed parent must never authorize a stale child relationship.
async function assertLinkedParent(
  tx: FirebaseFirestore.Transaction, uid: string, id: string, receipt: string,
  relation: unknown, graphRelation: unknown,
): Promise<string | null> {
  if (relation !== graphRelation) deny('SYNTHETIC_MEMORY_RELATION_MISMATCH');
  if (relation === null) return null;
  if (typeof relation !== 'string') return deny('SYNTHETIC_MEMORY_RELATION_INVALID');
  // Replay is a direct read, not a prerequisite Life Graph listing. Verify
  // the complete ancestry here, not only the immediate linked parent.
  // Each ancestor is read in the same Firestore transaction, before and
  // again after media access. A bounded chain cannot hide a stale source
  // or cycle that the Life Graph listing itself would reject.
  const firstRelation = relation;
  let ancestorId: string | null = relation;
  const seen = new Set<string>([id]);
  for (let depth = 0; ancestorId !== null; depth += 1) {
    if (depth >= 128 || !/^[A-Za-z0-9_-]{6,128}$/.test(ancestorId) ||
        seen.has(ancestorId)) return deny('SYNTHETIC_MEMORY_RELATION_INVALID');
    seen.add(ancestorId);
    const checkedId: string = ancestorId;
    const [parent, linkedGraph] = await Promise.all([
      tx.get(memoryRef(uid, checkedId)), tx.get(graphRef(uid, checkedId)),
    ]);
    const parentBytes = fixedBytes(checkedId);
    const parentDigest = sha(parentBytes);
    if (!parent.exists || !linkedGraph.exists ||
        parent.get('ownerUid') !== uid || parent.get('memoryId') !== checkedId ||
        parent.get('state') !== 'ACTIVE' || parent.get('synthetic') !== true ||
        parent.get('purpose') !== purpose || parent.get('policyVersion') !== policyVersion ||
        parent.get('sourceEvidenceClass') !== 'SYNTHETIC_TEST_ONLY' ||
        parent.get('decisionReceiptId') !== receipt ||
        parent.get('sourceSha256') !== parentDigest ||
        parent.get('byteLength') !== parentBytes.length ||
        parent.get('storagePath') !== 'staging_synthetic_memories/' + uid + '/' + checkedId + '.bin' ||
        linkedGraph.get('ownerUid') !== uid || linkedGraph.get('memoryId') !== checkedId ||
        linkedGraph.get('state') !== 'ACTIVE' || linkedGraph.get('synthetic') !== true ||
        linkedGraph.get('decisionReceiptId') !== receipt ||
        linkedGraph.get('sourceSha256') !== parentDigest ||
        linkedGraph.get('relatesTo') !== parent.get('relatedMemoryId')) {
      deny('SYNTHETIC_MEMORY_LINKED_SOURCE_UNAVAILABLE');
    }
    const next: unknown = parent.get('relatedMemoryId');
    if (next !== null && typeof next !== 'string') {
      return deny('SYNTHETIC_MEMORY_RELATION_INVALID');
    }
    ancestorId = next;
  }
  return firstRelation;
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
  // Deny missing, expired or forged consent BEFORE issuing even a synthetic
  // Storage write. The transaction below still rechecks consent after upload,
  // closing ordinary revoke/expiry races at admission.
  const preflightConsent = assertCurrentConsent((await consentRef(uid).get()).data(), uid);
  if (preflightConsent.decisionReceiptId !== receipt) deny('SYNTHETIC_CONSENT_RECEIPT_MISMATCH');
  try {
    // No caller-supplied bytes. This object is in a disposable Storage emulator.
    // Catch reported upload errors as well: a failed API response can arrive
    // after the emulator stored bytes, which still need best-effort cleanup.
    await storage.save(content, { resumable: false, metadata: {
      contentType: 'application/octet-stream',
      metadata: { synthetic: 'true', ownerUid: uid, sourceSha256: digest },
    } });
    await db.runTransaction(async tx => {
      const consent = assertCurrentConsent((await tx.get(consentRef(uid))).data(), uid);
      if (consent.decisionReceiptId !== receipt) deny('SYNTHETIC_CONSENT_RECEIPT_MISMATCH');
      if (relation !== null) {
        // Admission must verify the same parent/graph identity used by Replay.
        // Otherwise a stale or forged graph can create a child that is
        // immediately unusable, despite having an apparently valid parent.
        const [linked, linkedGraph] = await Promise.all([
          tx.get(memoryRef(uid, relation)), tx.get(graphRef(uid, relation)),
        ]);
        const linkedBytes = fixedBytes(relation);
        const linkedDigest = sha(linkedBytes);
        if (!linked.exists || !linkedGraph.exists ||
          linked.get('ownerUid') !== uid || linked.get('memoryId') !== relation ||
          linked.get('state') !== 'ACTIVE' || linked.get('synthetic') !== true ||
          linked.get('purpose') !== purpose || linked.get('policyVersion') !== policyVersion ||
          linked.get('sourceEvidenceClass') !== 'SYNTHETIC_TEST_ONLY' ||
          linked.get('decisionReceiptId') !== receipt ||
          linked.get('sourceSha256') !== linkedDigest ||
          linked.get('byteLength') !== linkedBytes.length ||
          linked.get('storagePath') !== 'staging_synthetic_memories/' + uid + '/' + relation + '.bin' ||
          linkedGraph.get('ownerUid') !== uid || linkedGraph.get('memoryId') !== relation ||
          linkedGraph.get('state') !== 'ACTIVE' || linkedGraph.get('synthetic') !== true ||
          linkedGraph.get('decisionReceiptId') !== receipt ||
          linkedGraph.get('sourceSha256') !== linkedDigest ||
          linkedGraph.get('relatesTo') !== linked.get('relatedMemoryId')) {
          deny('SYNTHETIC_GRAPH_SOURCE_UNAVAILABLE');
        }
        // A parent can itself be a linked child. Enforce its complete
        // owner/consent-bound ancestry at admission, just as direct Replay
        // does, so an invalid grandparent cannot authorize a new child.
        await assertLinkedParent(tx, uid, relation, receipt,
          linked.get('relatedMemoryId'), linkedGraph.get('relatesTo'));
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
    const consent = assertCurrentConsent(c.data(), uid);
    const row = m.data();
    if (!row) throw new functions.https.HttpsError('permission-denied', 'SYNTHETIC_MEMORY_UNAVAILABLE');
    if (!m.exists || !g.exists || row.ownerUid !== uid || row.memoryId !== id ||
      row.state !== 'ACTIVE' || row.synthetic !== true ||
      row.sourceEvidenceClass !== 'SYNTHETIC_TEST_ONLY' ||
      row.decisionReceiptId !== consent.decisionReceiptId ||
      g.get('ownerUid') !== uid || g.get('memoryId') !== id ||
      g.get('state') !== 'ACTIVE' || g.get('synthetic') !== true ||
      g.get('sourceSha256') !== row.sourceSha256 ||
      g.get('decisionReceiptId') !== consent.decisionReceiptId ||
      row.purpose !== purpose || row.policyVersion !== policyVersion) deny('SYNTHETIC_MEMORY_UNAVAILABLE');
    const relation = await assertLinkedParent(tx, uid, id, consent.decisionReceiptId,
      row.relatedMemoryId, g.get('relatesTo'));
    return { sourceSha256: String(row.sourceSha256), storagePath: String(row.storagePath),
      receipt: String(consent.decisionReceiptId), byteLength: Number(row.byteLength), relation };
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
    const [c, m, g] = await Promise.all([
      tx.get(consentRef(uid)), tx.get(memoryRef(uid, id)), tx.get(graphRef(uid, id)),
    ]);
    const consent = assertCurrentConsent(c.data(), uid);
    // Media bytes were fetched outside the transaction. Revalidate every
    // owner/consent/source/graph identity before returning any bytes.
    if (consent.decisionReceiptId !== first.receipt || !m.exists || !g.exists ||
      m.get('ownerUid') !== uid || m.get('memoryId') !== id ||
      m.get('state') !== 'ACTIVE' || m.get('synthetic') !== true ||
      m.get('sourceEvidenceClass') !== 'SYNTHETIC_TEST_ONLY' ||
      m.get('decisionReceiptId') !== first.receipt ||
      m.get('sourceSha256') !== first.sourceSha256 ||
      m.get('storagePath') !== expectedPath || m.get('byteLength') !== first.byteLength ||
      g.get('ownerUid') !== uid || g.get('memoryId') !== id ||
      g.get('state') !== 'ACTIVE' || g.get('synthetic') !== true ||
      g.get('sourceSha256') !== first.sourceSha256 ||
      g.get('decisionReceiptId') !== first.receipt ||
      m.get('purpose') !== purpose || m.get('policyVersion') !== policyVersion ||
      m.get('relatedMemoryId') !== first.relation || g.get('relatesTo') !== first.relation) {
      deny('SYNTHETIC_MEMORY_REVOKED_DURING_READ');
    }
    await assertLinkedParent(tx, uid, id, first.receipt, first.relation, g.get('relatesTo'));
  });
  return { ownerUid: uid, memoryId: id, synthetic: true,
    sourceSha256: first.sourceSha256, mediaBase64: bytes.toString('base64') };
});

export const getStagingSyntheticLifeGraph = functions.https.onCall(async (data: unknown, context) => {
  const uid = uidFrom(context);
  const input = strict(data, ['ownerUid']);
  assertOwner(input, uid);
  const db = getFirestore();
  // A graph node is not evidence by itself. Read its consent, graph and
  // corresponding memory records in one Firestore transaction, so stale,
  // forged or orphaned nodes cannot be returned as active source memories.
  const nodes = await db.runTransaction(async tx => {
    const consent = assertCurrentConsent((await tx.get(consentRef(uid))).data(), uid);
    const graph = await tx.get(db.collection('staging_synthetic_life_graph').doc(uid).collection('nodes'));
    // Bound the disposable probe and require every relation target to be
    // present in the same consent-checked graph snapshot.
    if (graph.size > 128) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
    const graphIds = new Set(graph.docs.map(node => node.id));
    const memories = await Promise.all(graph.docs.map(x => tx.get(memoryRef(uid, x.id))));
    return graph.docs.map((node, i) => {
      const g = node.data(), memory = memories[i];
      const m = memory.data();
      const id = node.id;
      // This disposable source is created with Firestore-generated ID tokens.
      // Reject alternate Firestore document names even if someone forges a
      // matching graph, memory row and synthetic SHA together.
      if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
      if (g.relatesTo !== null && (typeof g.relatesTo !== 'string' ||
        g.relatesTo === id || !graphIds.has(g.relatesTo))) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
      const expectedBytes = fixedBytes(id);
      const expectedPath = 'staging_synthetic_memories/' + uid + '/' + id + '.bin';
      if (!memory.exists || !m || g.ownerUid !== uid || g.memoryId !== id ||
        g.synthetic !== true || g.state !== 'ACTIVE' ||
        g.decisionReceiptId !== consent.decisionReceiptId ||
        g.sourceSha256 !== sha(expectedBytes) ||
        m.ownerUid !== uid || m.memoryId !== id ||
        m.state !== 'ACTIVE' || m.synthetic !== true ||
        m.purpose !== purpose || m.policyVersion !== policyVersion ||
        m.sourceEvidenceClass !== 'SYNTHETIC_TEST_ONLY' ||
        m.decisionReceiptId !== consent.decisionReceiptId ||
        m.sourceSha256 !== g.sourceSha256 ||
        m.storagePath !== expectedPath || m.byteLength !== expectedBytes.length ||
        m.relatedMemoryId !== g.relatesTo) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
      return { memoryId: id, relatesTo: g.relatesTo, sourceSha256: g.sourceSha256 };
    });
  });
  // Creation only permits links to an *already existing* memory. Cycles
  // therefore cannot be produced by the legitimate creation endpoint.
  // The graph is bounded to 128 nodes above, so this ancestry check is
  // deterministic, bounded, and uses only the consent-bound snapshot.
  const parents = new Map<string, string | null>(nodes.map(node => [node.memoryId, node.relatesTo]));
  for (const start of parents.keys()) {
    const seen = new Set<string>();
    let current: string | null = start;
    while (current !== null) {
      if (seen.has(current)) deny('SYNTHETIC_GRAPH_SOURCE_INVALID');
      seen.add(current);
      current = parents.get(current) ?? null;
    }
  }
  return { ownerUid: uid, synthetic: true, nodes };
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
  let batch = db.batch();
  let pendingWrites = 0;
  let removed = 0;
  for (const item of docs.docs) {
    const row = item.data();
    if (row.ownerUid !== uid || row.storagePath !== 'staging_synthetic_memories/' + uid + '/' + item.id + '.bin') {
      deny('SYNTHETIC_CLEANUP_SOURCE_MISMATCH');
    }
    await memoryBucket().file(row.storagePath).delete({ignoreNotFound:true});
    batch.delete(item.ref);
    batch.delete(graphRef(uid, item.id));
    pendingWrites += 2;
    removed++;
    // Two document deletes per memory: keep well below the 500-write batch
    // limit. Previous committed chunks remain denied by revoked consent;
    // retries complete any uncommitted residual cleanup after a failure.
    if (pendingWrites >= 400) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }
  if (pendingWrites) await batch.commit();
  // A process can fail after its synthetic Storage upload but before
  // Firestore admission (or before the compensating delete). Such an object
  // has no memory row and cannot be found in the inventory deleted above.
  // List ONLY this authenticated owner's disposable synthetic prefix; fail
  // closed if an unexpected object path appears instead of deleting it.
  // Verify that ALL leftover synthetic Storage objects belong to this owner
  // before removing any; never mark revocation clean on incomplete listing.
  const orphanStorageObjectCount = await sweepSyntheticStorageResidue(
    uid,
    async prefix => (await memoryBucket().getFiles({prefix}))[0],
    deny,
  );
  const orphanGraph = await db.collection('staging_synthetic_life_graph').doc(uid).collection('nodes').get();
  if (!orphanGraph.empty) deny('SYNTHETIC_GRAPH_CLEANUP_INCOMPLETE');
  await ref.update({cleanupComplete: true});
  return { status: 'revoked', ownerUid: uid, deletedMemoryCount: removed,
    orphanStorageObjectCount, storageCleared: true, graphCleared: true, synthetic: true };
});
