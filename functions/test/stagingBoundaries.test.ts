import { describe, expect, it } from 'vitest';
import {
  FixedWindowRateLimiter,
  MAX_STAGING_HTTP_BODY_BYTES,
  STAGING_COMPANION_REQUESTS_PER_WINDOW,
  STAGING_HTTP_RATE_WINDOW_MS,
  isAllowedStagingOrigin,
  isLikelyEmail,
  isStagingHttpBodyWithinLimit,
  isSyntheticStagingEmail,
  stagingEphemeralClientKey,
  stagingRuntimeBuildInfo,
  stagingWaitlistDocumentId,
} from '../src/lib/stagingBoundaries';

describe('staging HTTP boundaries', () => {
  it('allows only canonical staging and emulator browser origins while preserving no-Origin server smoke', () => {
    expect(isAllowedStagingOrigin(undefined)).toBe(true);
    expect(isAllowedStagingOrigin('https://urai-staging.web.app')).toBe(true);
    expect(isAllowedStagingOrigin('http://127.0.0.1:5000')).toBe(true);
    expect(isAllowedStagingOrigin('https://urai.app')).toBe(false);
    expect(isAllowedStagingOrigin('https://evil.example')).toBe(false);
  });

  it('applies deterministic in-memory fixed-window caps without persisting client identifiers', () => {
    const limiter = new FixedWindowRateLimiter(2, STAGING_HTTP_RATE_WINDOW_MS);
    const key = stagingEphemeralClientKey('203.0.113.42');
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain('203.0.113.42');
    expect(limiter.consume(key, 1_000)).toBe(true);
    expect(limiter.consume(key, 1_001)).toBe(true);
    expect(limiter.consume(key, 1_002)).toBe(false);
    expect(limiter.consume(key, 1_000 + STAGING_HTTP_RATE_WINDOW_MS)).toBe(true);
    expect(STAGING_COMPANION_REQUESTS_PER_WINDOW).toBeGreaterThan(0);
  });

  it('bounds parsed HTTP payload size', () => {
    expect(isStagingHttpBodyWithinLimit({ message: 'ok' })).toBe(true);
    expect(isStagingHttpBodyWithinLimit({ message: 'x'.repeat(MAX_STAGING_HTTP_BODY_BYTES) })).toBe(false);
  });
});

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
