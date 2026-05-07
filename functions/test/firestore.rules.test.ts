import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'urai-staging-test',
    firestore: {
      rules: readFileSync(resolve(process.cwd(), '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore staging rules', () => {
  it('allows users to create and read their own staging user document', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    const userRef = doc(db, 'staging_users/user-a');

    await assertSucceeds(setDoc(userRef, { displayName: 'User A', updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(userRef));
  });

  it('denies access to another user document', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(getDoc(doc(db, 'staging_users/user-b')));
  });

  it('rejects unexpected fields on user documents', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(setDoc(doc(db, 'staging_users/user-a'), { displayName: 'User A', isAdmin: true }));
  });

  it('allows authenticated users to append valid staging events', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'staging_events/event-1'), {
        type: 'smoke.test',
        actorUid: 'user-a',
        payload: { ok: true },
        createdAt: serverTimestamp(),
      })
    );
  });

  it('rejects staging events with a mismatched actorUid', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(
      setDoc(doc(db, 'staging_events/event-1'), {
        type: 'smoke.test',
        actorUid: 'user-b',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('prevents clients from reading staging events', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'staging_events/event-1'), {
        type: 'smoke.test',
        actorUid: 'user-a',
        createdAt: serverTimestamp(),
      });
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(getDoc(doc(db, 'staging_events/event-1')));
  });

  it('allows signed-in users to read feature flags', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'staging_featureFlags/demo'), { flag: 'demo', enabled: true });
    });

    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertSucceeds(getDoc(doc(db, 'staging_featureFlags/demo')));
  });

  it('allows admins to write feature flags with descriptions', async () => {
    const db = testEnv.authenticatedContext('admin-a', { role: 'admin' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'staging_featureFlags/demo'), {
        flag: 'demo',
        enabled: true,
        description: 'Demo feature flag',
        updatedBy: 'admin-a',
      })
    );
  });

  it('allows admins to write feature flags without descriptions', async () => {
    const db = testEnv.authenticatedContext('admin-a', { role: 'admin' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'staging_featureFlags/no-description'), {
        flag: 'no-description',
        enabled: false,
        updatedBy: 'admin-a',
      })
    );
  });

  it('rejects null feature flag descriptions', async () => {
    const db = testEnv.authenticatedContext('admin-a', { role: 'admin' }).firestore();
    await assertFails(
      setDoc(doc(db, 'staging_featureFlags/demo'), {
        flag: 'demo',
        enabled: true,
        description: null,
      })
    );
  });

  it('rejects non-admin feature flag writes', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(setDoc(doc(db, 'staging_featureFlags/demo'), { flag: 'demo', enabled: true }));
  });

  it('allows admins to manage staging jobs', async () => {
    const db = testEnv.authenticatedContext('admin-a', { role: 'admin' }).firestore();
    const jobRef = doc(db, 'staging_jobs/job-1');

    await assertSucceeds(
      setDoc(jobRef, {
        kind: 'release-validation',
        status: 'queued',
        payload: { candidate: 'rc-1' },
        createdBy: 'admin-a',
      })
    );

    await assertSucceeds(updateDoc(jobRef, { status: 'running', updatedBy: 'admin-a' }));
    await assertSucceeds(deleteDoc(jobRef));
  });

  it('rejects non-admin staging job access', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(setDoc(doc(db, 'staging_jobs/job-1'), { kind: 'release-validation', status: 'queued' }));
  });

  it('keeps unknown collections default-denied', async () => {
    const db = testEnv.authenticatedContext('user-a').firestore();
    await assertFails(setDoc(doc(db, 'unknown/doc-1'), { ok: true }));
    await assertFails(getDoc(doc(db, 'unknown/doc-1')));
  });
});
