import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { requireAdmin, requireAuth } from './lib/auth';
import {
  assertPlainObject,
  optionalPlainObject,
  optionalString,
  requiredBoolean,
  requiredSlug,
  requiredString,
} from './lib/validation';

admin.initializeApp();

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

export const healthCheck = functions.https.onCall(async () => {
  return {
    status: 'ok',
    service: 'urai-staging-functions',
  };
});

export const authenticatedHealthCheck = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  const auth = requireAuth(context);

  return {
    status: 'ok',
    uid: auth.uid,
  };
});

export const adminHealthCheck = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  const auth = requireAdmin(context);

  return {
    status: 'ok',
    uid: auth.uid,
    role: 'admin',
  };
});

export const recordStagingEvent = functions.https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
  const auth = requireAuth(context);
  const input = assertPlainObject(data, 'data');
  const type = requiredString(input.type, 'type', 80);
  const payload = optionalPlainObject(input.payload, 'payload');

  const eventRef = await db.collection('staging_events').add({
    type,
    payload,
    actorUid: auth.uid,
    createdAt: serverTimestamp(),
  });

  return {
    status: 'created',
    eventId: eventRef.id,
  };
});

export const getFeatureFlag = functions.https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
  requireAuth(context);
  const input = assertPlainObject(data, 'data');
  const flag = requiredSlug(input.flag, 'flag');

  const snapshot = await db.collection('staging_featureFlags').doc(flag).get();

  if (!snapshot.exists) {
    return {
      flag,
      exists: false,
      enabled: false,
    };
  }

  const flagData = snapshot.data() ?? {};

  return {
    flag,
    exists: true,
    enabled: flagData.enabled === true,
    description: typeof flagData.description === 'string' ? flagData.description : null,
  };
});

export const setFeatureFlag = functions.https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
  const auth = requireAdmin(context);
  const input = assertPlainObject(data, 'data');
  const flag = requiredSlug(input.flag, 'flag');
  const enabled = requiredBoolean(input.enabled, 'enabled');
  const description = optionalString(input.description, 'description', 500);

  await db.collection('staging_featureFlags').doc(flag).set(
    {
      flag,
      enabled,
      description,
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
    },
    { merge: true }
  );

  return {
    status: 'updated',
    flag,
    enabled,
  };
});

export const createStagingJob = functions.https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
  const auth = requireAdmin(context);
  const input = assertPlainObject(data, 'data');
  const kind = requiredSlug(input.kind, 'kind');
  const payload = optionalPlainObject(input.payload, 'payload');

  const jobRef = await db.collection('staging_jobs').add({
    kind,
    status: 'queued',
    payload,
    createdAt: serverTimestamp(),
    createdBy: auth.uid,
  });

  return {
    status: 'queued',
    jobId: jobRef.id,
  };
});
