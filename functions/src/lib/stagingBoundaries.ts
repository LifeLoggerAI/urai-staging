import { createHash, timingSafeEqual } from 'node:crypto';

export const STAGING_PROJECT_ID = 'urai-staging';
export const STAGING_HOSTING_URL = 'https://urai-staging.web.app';
export const MAX_STAGING_HTTP_BODY_BYTES = 8 * 1024;
export const STAGING_HTTP_RATE_WINDOW_MS = 60_000;
export const STAGING_COMPANION_REQUESTS_PER_WINDOW = 30;
export const STAGING_WAITLIST_REQUESTS_PER_WINDOW = 10;
export const STAGING_HTTP_MAX_RATE_BUCKETS = 2048;
export const STAGING_COMPANION_DAILY_BUDGET = 500;
export const STAGING_WAITLIST_DAILY_BUDGET = 100;
export const STAGING_HTTP_BUDGET_RETENTION_MS = 8 * 24 * 60 * 60 * 1000;
export const STAGING_WAITLIST_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxBuckets = STAGING_HTTP_MAX_RATE_BUCKETS,
  ) {}

  private pruneExpired(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) this.buckets.delete(key);
    }
  }

  consume(key: string, now = Date.now()): boolean {
    let current = this.buckets.get(key);
    if (!current && this.buckets.size >= this.maxBuckets) {
      this.pruneExpired(now);
      current = this.buckets.get(key);
      if (!current && this.buckets.size >= this.maxBuckets) return false;
    }
    if (!current || now - current.windowStart >= this.windowMs) {
      this.buckets.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}

export function stagingEphemeralClientKey(value: unknown): string {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : 'unknown-client';
  return createHash('sha256').update(raw).digest('hex');
}

export function isApprovedStagingWriteKey(presented: unknown, configured: unknown): boolean {
  if (typeof presented !== 'string' || typeof configured !== 'string') return false;
  if (!presented || !configured) return false;
  const left = Buffer.from(presented, 'utf8');
  const right = Buffer.from(configured, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function stagingUtcDayId(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const ALLOWED_STAGING_ORIGINS = new Set([
  STAGING_HOSTING_URL,
  'http://127.0.0.1:5000',
  'http://localhost:5000',
]);

export function isAllowedStagingOrigin(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && ALLOWED_STAGING_ORIGINS.has(value);
}

export function isStagingHttpBodyWithinLimit(value: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8') <= MAX_STAGING_HTTP_BODY_BYTES;
  } catch {
    return false;
  }
}

const SYNTHETIC_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'example.test',
]);

export function isLikelyEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) &&
    value.length <= 254
  );
}

export function isSyntheticStagingEmail(value: unknown): value is string {
  if (!isLikelyEmail(value)) return false;

  const normalized = value.trim().toLowerCase();
  const domain = normalized.split('@').at(-1) ?? '';

  return SYNTHETIC_EMAIL_DOMAINS.has(domain) || domain.endsWith('.example');
}

export function stagingWaitlistDocumentId(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export function stagingRuntimeBuildInfo(
  environment: NodeJS.ProcessEnv = process.env,
): {
  releaseCandidateSha: string;
  deployedAt: string;
  deploymentWorkflowRunId: string;
  providerRevision: string;
  providerService: string;
  runtimeProjectId: string;
  nodeEnv: string;
} {
  return {
    releaseCandidateSha: environment.URAI_RELEASE_CANDIDATE_SHA ?? 'unknown',
    deployedAt: environment.URAI_DEPLOYED_AT ?? 'unknown',
    deploymentWorkflowRunId:
      environment.URAI_DEPLOYMENT_WORKFLOW_RUN_ID ?? 'unknown',
    providerRevision: environment.K_REVISION ?? 'unknown',
    providerService:
      environment.K_SERVICE ?? environment.FUNCTION_TARGET ?? 'unknown',
    runtimeProjectId:
      environment.GCLOUD_PROJECT ?? environment.GCP_PROJECT ?? 'unknown',
    nodeEnv: environment.NODE_ENV ?? 'unknown',
  };
}
