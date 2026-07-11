import { createHash } from 'node:crypto';

export const STAGING_PROJECT_ID = 'urai-staging';
export const STAGING_HOSTING_URL = 'https://urai-staging.web.app';

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
