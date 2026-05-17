import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getCompletionSummary, FEATURE_MATRIX, ROADMAP_PHASES } from './lib/featureRegistry';
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
const STAGING_PROJECT_ID = 'urai-staging-35414255';
const STAGING_HOSTING_URL = 'https://urai-staging-35414255.web.app';

function setJsonHeaders(response: functions.Response): void {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Cache-Control', 'no-store');
}

function handleOptions(request: functions.Request, response: functions.Response): boolean {
  if (request.method === 'OPTIONS') {
    setJsonHeaders(response);
    response.status(204).send('');
    return true;
  }
  return false;
}

function sendJson(response: functions.Response, statusCode: number, body: Record<string, unknown>): void {
  setJsonHeaders(response);
  response.status(statusCode).json(body);
}

function bodyAsPlainObject(body: unknown): Record<string, unknown> {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function isLikelyEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254;
}

export const healthz = functions.https.onRequest((request, response) => {
  if (handleOptions(request, response)) return;
  if (request.method !== 'GET') {
    sendJson(response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  sendJson(response, 200, {
    status: 'ok',
    service: 'urai-staging',
    projectId: STAGING_PROJECT_ID,
    hostingUrl: STAGING_HOSTING_URL,
  });
});

export const buildinfo = functions.https.onRequest((request, response) => {
  if (handleOptions(request, response)) return;
  if (request.method !== 'GET') {
    sendJson(response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  sendJson(response, 200, {
    status: 'ok',
    service: 'urai-staging',
    projectId: STAGING_PROJECT_ID,
    hostingUrl: STAGING_HOSTING_URL,
    releaseCandidateSha: process.env.URAI_RELEASE_CANDIDATE_SHA ?? 'unknown',
    deployedAt: process.env.URAI_DEPLOYED_AT ?? 'unknown',
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
  });
});

export const companion = functions.https.onRequest(async (request, response) => {
  if (handleOptions(request, response)) return;
  if (request.method !== 'POST') {
    sendJson(response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  const body = bodyAsPlainObject(request.body);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length === 0) {
    sendJson(response, 400, {
      status: 'error',
      error: 'message_required',
      message: 'A non-empty message is required for the staging companion smoke endpoint.',
    });
    return;
  }

  await db.collection('staging_events').add({
    type: 'companion_smoke',
    payload: {
      messagePreview: message.slice(0, 120),
      source: typeof body.source === 'string' ? body.source.slice(0, 80) : 'staging-smoke',
    },
    actorUid: 'system:public-smoke',
    createdAt: serverTimestamp(),
  });

  sendJson(response, 200, {
    status: 'ok',
    service: 'urai-staging-companion',
    reply: 'URAI staging companion endpoint is reachable. Full AI provider wiring is intentionally validated by environment-specific smoke tests.',
  });
});

export const waitlist = functions.https.onRequest(async (request, response) => {
  if (handleOptions(request, response)) return;
  if (request.method !== 'POST') {
    sendJson(response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  const body = bodyAsPlainObject(request.body);
  if (!isLikelyEmail(body.email)) {
    sendJson(response, 400, {
      status: 'error',
      error: 'valid_email_required',
    });
    return;
  }

  const email = body.email.trim().toLowerCase();
  const entry = {
    email,
    source: typeof body.source === 'string' ? body.source.slice(0, 120) : 'staging',
    handle: typeof body.handle === 'string' ? body.handle.slice(0, 80) : null,
    intent: typeof body.intent === 'string' ? body.intent.slice(0, 160) : null,
    createdAt: serverTimestamp(),
    environment: 'staging',
  };

  await db.collection('staging_waitlist').doc(email).set(entry, { merge: true });

  sendJson(response, 200, {
    status: 'ok',
    service: 'urai-staging-waitlist',
    stored: true,
  });
});

export const healthCheck = functions.https.onCall(async () => {
  return {
    status: 'ok',
    service: 'urai-staging-functions',
    projectId: STAGING_PROJECT_ID,
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

  const flagUpdate: admin.firestore.DocumentData = {
    flag,
    enabled,
    updatedAt: serverTimestamp(),
    updatedBy: auth.uid,
  };

  if (description !== null) {
    flagUpdate.description = description;
  }

  await db.collection('staging_featureFlags').doc(flag).set(flagUpdate, { merge: true });

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

export const getStagingCompletionMatrix = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  requireAdmin(context);

  return {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    summary: getCompletionSummary(),
    phases: ROADMAP_PHASES,
    matrix: FEATURE_MATRIX,
  };
});
