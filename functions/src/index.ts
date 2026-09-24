import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { getCompletionSummary, FEATURE_MATRIX, ROADMAP_PHASES } from './lib/featureRegistry';
import { requireAdmin, requireAuth } from './lib/auth';
import {
  FixedWindowRateLimiter,
  MAX_STAGING_HTTP_BODY_BYTES,
  STAGING_COMPANION_REQUESTS_PER_WINDOW,
  STAGING_HTTP_RATE_WINDOW_MS,
  STAGING_WAITLIST_REQUESTS_PER_WINDOW,
  STAGING_HOSTING_URL,
  STAGING_PROJECT_ID,
  isAllowedStagingOrigin,
  isStagingHttpBodyWithinLimit,
  isSyntheticStagingEmail,
  stagingEphemeralClientKey,
  stagingRuntimeBuildInfo,
  stagingWaitlistDocumentId,
} from './lib/stagingBoundaries';
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
const companionRateLimiter = new FixedWindowRateLimiter(
  STAGING_COMPANION_REQUESTS_PER_WINDOW,
  STAGING_HTTP_RATE_WINDOW_MS,
);
const waitlistRateLimiter = new FixedWindowRateLimiter(
  STAGING_WAITLIST_REQUESTS_PER_WINDOW,
  STAGING_HTTP_RATE_WINDOW_MS,
);
const stagingHttpRuntime = functions.runWith({
  maxInstances: 2,
  timeoutSeconds: 15,
  memory: '256MB',
});

function setJsonHeaders(request: functions.Request, response: functions.Response): void {
  const origin = request.get('origin');
  if (origin && isAllowedStagingOrigin(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
    response.set('Vary', 'Origin');
  }
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Cache-Control', 'no-store');
}

function rejectUnapprovedOrigin(request: functions.Request, response: functions.Response): boolean {
  const origin = request.get('origin');
  if (isAllowedStagingOrigin(origin)) return false;
  response.set('Cache-Control', 'no-store');
  response.status(403).json({ status: 'error', error: 'origin_not_allowed' });
  return true;
}

function rejectOversizeBody(request: functions.Request, response: functions.Response): boolean {
  const header = request.get('content-length');
  const declaredLength = header ? Number.parseInt(header, 10) : Number.NaN;
  if (
    (Number.isFinite(declaredLength) && declaredLength > MAX_STAGING_HTTP_BODY_BYTES) ||
    !isStagingHttpBodyWithinLimit(request.body)
  ) {
    setJsonHeaders(request, response);
    response.status(413).json({ status: 'error', error: 'request_too_large' });
    return true;
  }
  return false;
}

function handleOptions(request: functions.Request, response: functions.Response): boolean {
  if (request.method === 'OPTIONS') {
    if (rejectUnapprovedOrigin(request, response)) return true;
    setJsonHeaders(request, response);
    response.status(204).send('');
    return true;
  }
  return false;
}

function sendJson(
  request: functions.Request,
  response: functions.Response,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  setJsonHeaders(request, response);
  response.status(statusCode).json(body);
}

function rejectRateLimited(
  request: functions.Request,
  response: functions.Response,
  limiter: FixedWindowRateLimiter,
): boolean {
  const forwarded = request.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = stagingEphemeralClientKey(forwarded || request.ip);
  if (limiter.consume(key)) return false;
  sendJson(request, response, 429, { status: 'error', error: 'rate_limited' });
  return true;
}

function bodyAsPlainObject(body: unknown): Record<string, unknown> {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export const healthz = stagingHttpRuntime.https.onRequest((request, response) => {
  if (handleOptions(request, response)) return;
  if (rejectUnapprovedOrigin(request, response)) return;
  if (request.method !== 'GET') {
    sendJson(request, response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  sendJson(request, response, 200, {
    status: 'ok',
    service: 'urai-staging',
    projectId: STAGING_PROJECT_ID,
    hostingUrl: STAGING_HOSTING_URL,
  });
});

export const buildinfo = stagingHttpRuntime.https.onRequest((request, response) => {
  if (handleOptions(request, response)) return;
  if (rejectUnapprovedOrigin(request, response)) return;
  if (request.method !== 'GET') {
    sendJson(request, response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  sendJson(request, response, 200, {
    status: 'ok',
    service: 'urai-staging',
    projectId: STAGING_PROJECT_ID,
    hostingUrl: STAGING_HOSTING_URL,
    ...stagingRuntimeBuildInfo(),
  });
});

export const companion = stagingHttpRuntime.https.onRequest(async (request, response) => {
  if (handleOptions(request, response)) return;
  if (rejectUnapprovedOrigin(request, response)) return;
  if (rejectOversizeBody(request, response)) return;
  if (rejectRateLimited(request, response, companionRateLimiter)) return;
  if (request.method !== 'POST') {
    sendJson(request, response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  const body = bodyAsPlainObject(request.body);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length === 0) {
    sendJson(request, response, 400, {
      status: 'error',
      error: 'message_required',
      message: 'A non-empty message is required for the staging companion smoke endpoint.',
    });
    return;
  }

  sendJson(request, response, 200, {
    status: 'ok',
    service: 'urai-staging-companion',
    persisted: false,
    reply: 'URAI staging companion endpoint is reachable. Full AI provider wiring is intentionally validated by environment-specific smoke tests.',
  });
});

export const waitlist = stagingHttpRuntime.https.onRequest(async (request, response) => {
  if (handleOptions(request, response)) return;
  if (rejectUnapprovedOrigin(request, response)) return;
  if (rejectOversizeBody(request, response)) return;
  if (rejectRateLimited(request, response, waitlistRateLimiter)) return;
  if (request.method !== 'POST') {
    sendJson(request, response, 405, { status: 'error', error: 'method_not_allowed' });
    return;
  }

  const body = bodyAsPlainObject(request.body);
  if (!isSyntheticStagingEmail(body.email)) {
    sendJson(request, response, 400, {
      status: 'error',
      error: 'synthetic_email_required',
      message: 'The staging waitlist accepts reserved synthetic email domains only.',
    });
    return;
  }

  const email = body.email.trim().toLowerCase();
  const documentId = stagingWaitlistDocumentId(email);
  const entry = {
    email,
    source: typeof body.source === 'string' ? body.source.slice(0, 120) : 'staging',
    handle: typeof body.handle === 'string' ? body.handle.slice(0, 80) : null,
    intent: typeof body.intent === 'string' ? body.intent.slice(0, 160) : null,
    createdAt: serverTimestamp(),
    environment: 'staging',
    synthetic: true,
  };

  await db.collection('staging_waitlist').doc(documentId).set(entry, { merge: true });

  sendJson(request, response, 200, {
    status: 'ok',
    service: 'urai-staging-waitlist',
    stored: true,
    synthetic: true,
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
