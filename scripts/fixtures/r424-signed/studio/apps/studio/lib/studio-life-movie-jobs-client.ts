import 'server-only';

import { readStudioLongformJson } from './studio-life-movie-longform-contract';

export type StudioJobsRenderConsent = {
  purpose: 'life-movie.render';
  policyVersion: string;
  decisionReceiptId: string;
};

export function requireStudioJobsRenderConsent(value: unknown): StudioJobsRenderConsent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('life_movie_invalid_render_consent');
  // Consent is authority-bearing data, not executable object behavior. Never
  // invoke accessor properties or accept an inherited authority prototype.
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error('invalid_consent_prototype');
    const keys = Reflect.ownKeys(value);
    const required = ['purpose', 'policyVersion', 'decisionReceiptId'] as const;
    if (keys.length !== required.length ||
        keys.some((key) => typeof key !== 'string' || !required.includes(key as typeof required[number]))) {
      throw new Error('invalid_consent_fields');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!required.every((key) => Object.prototype.hasOwnProperty.call(descriptors, key)
      && Object.prototype.hasOwnProperty.call(descriptors[key], 'value'))) {
      throw new Error('invalid_consent_accessor');
    }
    const purpose = descriptors.purpose.value;
    const policy = descriptors.policyVersion.value;
    const receipt = descriptors.decisionReceiptId.value;
    if (purpose !== 'life-movie.render' || typeof policy !== 'string' || typeof receipt !== 'string') {
      throw new Error('invalid_consent_values');
    }
    const policyVersion = policy.trim(), decisionReceiptId = receipt.trim();
    if (policyVersion !== '1.1.0' || !/^[0-9a-f]{64}$/.test(decisionReceiptId)) {
      throw new Error('invalid_consent_policy');
    }
    return { purpose: 'life-movie.render', policyVersion, decisionReceiptId };
  } catch {
    // Do not expose proxy trap details, caller secrets, or raw input objects.
    throw new Error('life_movie_invalid_render_consent');
  }
}

export type StudioJobsBridgeAction =
  | { action: 'create'; tenantId: string; userId: string; idempotencyKey: string; consent: StudioJobsRenderConsent; payload: Record<string, unknown> }
  | { action: 'status' | 'cancel' | 'playback' | 'download' | 'delete-output'; tenantId: string; userId: string; jobId: string };

export type StudioJobsBridgeStatus = {
  enabled: boolean;
  configured: boolean;
  urlConfigured: boolean;
  tokenConfigured: boolean;
  production: boolean;
  dispatchAvailable: boolean;
  reason?: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;
// Jobs studioLifeMovieBridge rejects a 32 KiB JSON envelope. Enforce the
// receiving service limit before transmitting the Studio bridge credential.
const JOBS_BRIDGE_MAX_BODY_BYTES = 32 * 1024;

function productionRuntime() {
  return process.env.NODE_ENV === 'production';
}

function dispatchEnabled() {
  return process.env.URAI_STUDIO_JOBS_DISPATCH_ENABLED === 'true';
}

function bridgeUrl() {
  return String(process.env.URAI_JOBS_BRIDGE_URL || '').trim();
}

function bridgeToken() {
  return String(process.env.URAI_STUDIO_JOBS_BRIDGE_TOKEN || '').trim();
}

function validateBridgeUrl(raw: string) {
  if (!raw) throw new Error('jobs_bridge_url_missing');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('jobs_bridge_url_invalid');
  }

  if (url.username || url.password || url.search || url.hash) throw new Error('jobs_bridge_url_invalid');
  if (url.protocol === 'https:') return url;

  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (!productionRuntime() && url.protocol === 'http:' && loopback) return url;

  throw new Error('jobs_bridge_url_not_approved');
}

export function studioJobsBridgeStatus(): StudioJobsBridgeStatus {
  const enabled = dispatchEnabled();
  const rawUrl = bridgeUrl();
  const token = bridgeToken();
  let urlValid = false;
  try {
    if (rawUrl) {
      validateBridgeUrl(rawUrl);
      urlValid = true;
    }
  } catch {
    urlValid = false;
  }

  const configured = urlValid && Boolean(token);
  return {
    enabled,
    configured,
    urlConfigured: urlValid,
    tokenConfigured: Boolean(token),
    production: productionRuntime(),
    dispatchAvailable: enabled && configured,
    reason: !enabled
      ? 'dispatch_disabled'
      : !urlValid
        ? 'bridge_url_unconfigured_or_invalid'
        : !token
          ? 'bridge_token_missing'
          : undefined,
  };
}

export async function callStudioJobsBridge(
  input: StudioJobsBridgeAction,
  options: { timeoutMs?: number } = {},
): Promise<Record<string, unknown>> {
  const status = studioJobsBridgeStatus();
  if (!status.dispatchAvailable) throw new Error(status.reason || 'jobs_bridge_unavailable');

  const url = validateBridgeUrl(bridgeUrl());
  const token = bridgeToken();
  if (!token) throw new Error('bridge_token_missing');
  const envelope = input.action === 'create' ? { ...input, consent: requireStudioJobsRenderConsent(input.consent) } : input;

  const timeoutMs = Math.max(1_000, Math.min(30_000, options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const encoded = JSON.stringify(envelope);
  if (Buffer.byteLength(encoded, 'utf8') > JOBS_BRIDGE_MAX_BODY_BYTES) throw new Error('life_movie_request_too_large');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      cache: 'no-store',
      // Private plans and the bridge credential are bound to the configured
      // endpoint. A redirect must never replay them to another endpoint.
      redirect: 'error',
      signal: controller.signal,
      body: encoded,
    });

    const body = await readStudioLongformJson(response, 2 * 1024 * 1024, controller.signal).catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('jobs_bridge_invalid_response');
    }

    if (!response.ok || (body as Record<string, unknown>).ok !== true) {
      const code = typeof (body as Record<string, unknown>).error === 'string'
        && /^[a-z0-9_]{1,120}$/.test(String((body as Record<string, unknown>).error))
        ? String((body as Record<string, unknown>).error)
        : `jobs_bridge_http_${response.status}`;
      throw new Error(code);
    }

    return body as Record<string, unknown>;
  } catch (error) {
    // Body parsing converts stream errors into a safe JSON failure. The same
    // deadline still owns that phase, so retain timeout recovery after headers.
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw new Error('jobs_bridge_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

