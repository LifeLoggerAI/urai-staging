// Supplemental real Storage SDK acceptance. Never substitutes for R451.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { sweepSyntheticStorageResidue } from '../src/syntheticStorageResidue.ts';

// Fail before loading Admin SDK or opening a connection unless explicitly local.
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
assert.equal(process.env.GCLOUD_PROJECT, 'urai-staging-test');
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN']) {
  assert.ok(!process.env[key], `${key} forbidden in disposable Storage test`);
}
const { initializeApp, deleteApp } = await import('firebase-admin/app');
const { getStorage } = await import('firebase-admin/storage');
const app = initializeApp({ projectId: 'urai-staging-test' }, 'storage-residue-' + randomUUID());
const bucket = getStorage(app).bucket('urai-staging-test.appspot.com');
const owner = 'sdk_owner_' + randomUUID().replaceAll('-', '');
const sibling = owner + '_sibling';
const prefix = uid => 'staging_synthetic_memories/' + uid + '/';
const list = async path => (await bucket.getFiles({ prefix: path }))[0];
const deny = code => { throw new Error(code); };
const save = async (uid, id) => bucket.file(prefix(uid) + id + '.bin')
  .save(Buffer.from('URAI_DISPOSABLE_SYNTHETIC_MEMORY:' + id), { resumable: false });

test('real Storage SDK cleanup preserves owner boundaries and verifies empty residue', { timeout: 120000 }, async t => {
  try {
    await t.test('malformed owner is denied before any real SDK listing', async () => {
      let calls = 0;
      await assert.rejects(sweepSyntheticStorageResidue('../foreign', async p => {
        calls++;
        return list(p);
      }, deny), /SYNTHETIC_OWNER_UID_INVALID/);
      assert.equal(calls, 0);
    });
    await t.test('foreign SDK File in listing denies before any deletion', async () => {
      await save(owner, 'owned_memory');
      await save(sibling, 'sibling_memory');
      const ownedFiles = await list(prefix(owner));
      const siblingFiles = await list(prefix(sibling));
      assert.equal(ownedFiles.length, 1);
      assert.equal(siblingFiles.length, 1);
      await assert.rejects(sweepSyntheticStorageResidue(owner,
        async () => [...ownedFiles, ...siblingFiles], deny), /SYNTHETIC_CLEANUP_SOURCE_MISMATCH/);
      assert.equal((await list(prefix(owner))).length, 1);
      assert.equal((await list(prefix(sibling))).length, 1);
    });
    await t.test('252 real orphan objects are removed; sibling bytes survive', async () => {
      // Together with owned_memory this exceeds the 251-record acceptance boundary.
      // Use bounded upload batches; this test needs no Functions worker or Firestore.
      for (let start = 0; start < 251; start += 16) {
        await Promise.all(Array.from({ length: Math.min(16, 251 - start) }, (_, i) =>
          save(owner, 'orphan_' + String(start + i).padStart(6, '0'))));
      }
      assert.equal((await list(prefix(owner))).length, 252);
      const siblingFile = bucket.file(prefix(sibling) + 'sibling_memory.bin');
      const [before] = await siblingFile.download();
      assert.equal(await sweepSyntheticStorageResidue(owner, list, deny), 252);
      assert.deepEqual(await list(prefix(owner)), []);
      assert.deepEqual((await siblingFile.download())[0], before);
    });
    await t.test('repeat cleanup is idempotent with real empty SDK listing', async () => {
      assert.equal(await sweepSyntheticStorageResidue(owner, list, deny), 0);
      assert.equal((await list(prefix(sibling))).length, 1);
    });
  } finally {
    // Only this run's randomized synthetic prefixes, on the guarded local emulator.
    try {
      for (const uid of [owner, sibling]) {
        for (const file of await list(prefix(uid))) await file.delete({ ignoreNotFound: true });
      }
    } finally {
      await deleteApp(app);
    }
  }
});
