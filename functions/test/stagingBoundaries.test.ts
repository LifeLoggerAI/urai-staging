import { describe, expect, it } from 'vitest';
import {
  isLikelyEmail,
  isSyntheticStagingEmail,
  stagingRuntimeBuildInfo,
  stagingWaitlistDocumentId,
} from '../src/lib/stagingBoundaries';

describe('staging privacy boundaries', () => {
  it('accepts reserved synthetic email domains only', () => {
    expect(isSyntheticStagingEmail('launch-smoke@example.com')).toBe(true);
    expect(isSyntheticStagingEmail('person@example.test')).toBe(true);
    expect(isSyntheticStagingEmail('person@subdomain.example')).toBe(true);
    expect(isSyntheticStagingEmail('person@gmail.com')).toBe(false);
    expect(isSyntheticStagingEmail('not-an-email')).toBe(false);
  });

  it('keeps generic email validation separate from the staging-only policy', () => {
    expect(isLikelyEmail('person@gmail.com')).toBe(true);
    expect(isLikelyEmail('missing-at-symbol')).toBe(false);
  });

  it('uses deterministic pseudonymous waitlist document IDs', () => {
    const first = stagingWaitlistDocumentId('Launch-Smoke@Example.com');
    const second = stagingWaitlistDocumentId('launch-smoke@example.com');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain('example.com');
  });
});

describe('staging runtime build identity', () => {
  it('returns exact configured runtime identity fields', () => {
    expect(
      stagingRuntimeBuildInfo({
        URAI_RELEASE_CANDIDATE_SHA:
          '0123456789abcdef0123456789abcdef01234567',
        URAI_DEPLOYED_AT: '2026-07-11T17:30:00Z',
        URAI_DEPLOYMENT_WORKFLOW_RUN_ID: '29164829404',
        K_REVISION: 'buildinfo-00042-abc',
        K_SERVICE: 'buildinfo',
        GCLOUD_PROJECT: 'urai-staging',
        NODE_ENV: 'production',
      }),
    ).toEqual({
      releaseCandidateSha: '0123456789abcdef0123456789abcdef01234567',
      deployedAt: '2026-07-11T17:30:00Z',
      deploymentWorkflowRunId: '29164829404',
      providerRevision: 'buildinfo-00042-abc',
      providerService: 'buildinfo',
      runtimeProjectId: 'urai-staging',
      nodeEnv: 'production',
    });
  });

  it('fails visibly through unknown markers when provider metadata is absent', () => {
    expect(stagingRuntimeBuildInfo({})).toEqual({
      releaseCandidateSha: 'unknown',
      deployedAt: 'unknown',
      deploymentWorkflowRunId: 'unknown',
      providerRevision: 'unknown',
      providerService: 'unknown',
      runtimeProjectId: 'unknown',
      nodeEnv: 'unknown',
    });
  });
});
