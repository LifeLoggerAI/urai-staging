import { createHash } from 'node:crypto';

export const STAGING_PROJECT_ID = 'urai-staging';
export const STAGING_HOSTING_URL = 'https://urai-staging.web.app';
export const MAX_STAGING_HTTP_BODY_BYTES = 8 * 1024;

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
