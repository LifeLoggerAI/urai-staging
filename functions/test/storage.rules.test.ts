import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getMetadata, ref, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Emulator-only security contract. A passing test is NOT a live Firebase
// Auth/Storage session, server-side consent/revocation propagation, or a
// source-approved private media upload.
let testEnv: RulesTestEnvironment;
const bucket = 'gs://urai-staging-test.appspot.com';
const fixture = new Uint8Array([85, 82, 65, 73]); // privacy-safe synthetic bytes
const upload = (storage: ReturnType<ReturnType<RulesTestEnvironment['authenticatedContext']>['storage']>, path: string) =>
  uploadBytes(ref(storage, path), fixture, { contentType: 'application/octet-stream' });

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'urai-staging-test',
    storage: {
      rules: readFileSync(resolve(process.cwd(), '../storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('staging Storage emulator — actual security rules', () => {
  it('rejects anonymous reads and uploads into private user media', async () => {
    const anonymous = testEnv.unauthenticatedContext().storage(bucket);
    await assertFails(getMetadata(ref(anonymous, 'staging_users/user-a/anonymous-denied.bin')));
    await assertFails(upload(anonymous, 'staging_users/user-a/anonymous-denied.bin'));
  });

  it('allows an owner to create, read metadata and remove only their private media', async () => {
    const owner = testEnv.authenticatedContext('user-a').storage(bucket);
    const file = ref(owner, 'staging_users/user-a/owner-lifecycle.bin');
    await assertSucceeds(upload(owner, 'staging_users/user-a/owner-lifecycle.bin'));
    await assertSucceeds(getMetadata(file));
    await assertSucceeds(deleteObject(file));
  });

  it('rejects authenticated cross-user read, overwrite and deletion', async () => {
    const owner = testEnv.authenticatedContext('user-a').storage(bucket);
    const other = testEnv.authenticatedContext('user-b').storage(bucket);
    await assertSucceeds(upload(owner, 'staging_users/user-a/cross-tenant-denied.bin'));
    const victim = ref(other, 'staging_users/user-a/cross-tenant-denied.bin');
    await assertFails(getMetadata(victim));
    await assertFails(upload(other, 'staging_users/user-a/cross-tenant-denied.bin'));
    await assertFails(deleteObject(victim));
    await assertSucceeds(deleteObject(ref(owner, 'staging_users/user-a/cross-tenant-denied.bin')));
  });

  it('does not grant private reads when the simulated session disappears', async () => {
    const owner = testEnv.authenticatedContext('user-c').storage(bucket);
    const revokedContext = testEnv.unauthenticatedContext().storage(bucket);
    await assertSucceeds(upload(owner, 'staging_users/user-c/session-bound.bin'));
    await assertFails(getMetadata(ref(revokedContext, 'staging_users/user-c/session-bound.bin')));
    await assertFails(deleteObject(ref(revokedContext, 'staging_users/user-c/session-bound.bin')));
    // This models missing credentials, not actual Firebase token revocation.
    await assertSucceeds(deleteObject(ref(owner, 'staging_users/user-c/session-bound.bin')));
  });

  it('allows public fixture reads but rejects ordinary-user public writes', async () => {
    const admin = testEnv.authenticatedContext('admin-a', { role: 'admin' }).storage(bucket);
    const anonymous = testEnv.unauthenticatedContext().storage(bucket);
    const user = testEnv.authenticatedContext('user-a').storage(bucket);
    const path = 'staging_public/approved-synthetic-fixture.bin';
    await assertSucceeds(upload(admin, path));
    await assertSucceeds(getMetadata(ref(anonymous, path)));
    await assertFails(upload(user, path));
    await assertFails(deleteObject(ref(user, path)));
    await assertSucceeds(deleteObject(ref(admin, path)));
  });

  it('keeps staging_admin readable and writable by admins only', async () => {
    const admin = testEnv.authenticatedContext('admin-a', { role: 'admin' }).storage(bucket);
    const user = testEnv.authenticatedContext('user-a').storage(bucket);
    const anonymous = testEnv.unauthenticatedContext().storage(bucket);
    const path = 'staging_admin/synthetic-evidence.bin';
    await assertSucceeds(upload(admin, path));
    await assertSucceeds(getMetadata(ref(admin, path)));
    await assertFails(getMetadata(ref(user, path)));
    await assertFails(getMetadata(ref(anonymous, path)));
    await assertFails(upload(user, path));
    await assertSucceeds(deleteObject(ref(admin, path)));
  });

  it('default-denies unknown paths even for a staging admin', async () => {
    const admin = testEnv.authenticatedContext('admin-a', { role: 'admin' }).storage(bucket);
    await assertFails(upload(admin, 'actual-private-memories/not-admitted.bin'));
    await assertFails(getMetadata(ref(admin, 'actual-private-memories/not-admitted.bin')));
  });
});
