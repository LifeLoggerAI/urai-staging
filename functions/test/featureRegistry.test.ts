import { describe, expect, it } from 'vitest';
import { FEATURE_MATRIX, FEATURE_STATUSES, getCompletionSummary } from '../src/lib/featureRegistry';

describe('feature registry', () => {
  it('uses only approved status labels', () => {
    const allowedStatuses = new Set(FEATURE_STATUSES);

    for (const item of FEATURE_MATRIX) {
      expect(allowedStatuses.has(item.status)).toBe(true);
    }
  });

  it('tracks launch gate failures while the UI and product systems are missing', () => {
    const summary = getCompletionSummary();

    expect(summary.totalSystems).toBe(FEATURE_MATRIX.length);
    expect(summary.launchGateFailures.length).toBeGreaterThan(0);
    expect(summary.confidence).toBeLessThan(85);
  });

  it('does not report unverified product modules as complete', () => {
    const unverifiedSystems = FEATURE_MATRIX.filter((item) => item.files.length === 0 && item.routes.length === 0);

    expect(unverifiedSystems.length).toBeGreaterThan(0);
    expect(unverifiedSystems.every((item) => item.status !== 'COMPLETE AND WIRED')).toBe(true);
  });
});
