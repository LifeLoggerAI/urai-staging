import { describe, expect, it } from 'vitest';
import { FEATURE_MATRIX, FEATURE_STATUSES, getCompletionSummary } from '../src/lib/featureRegistry';

describe('feature registry', () => {
  it('uses only approved status labels and explicit scopes', () => {
    const allowedStatuses = new Set(FEATURE_STATUSES);
    const allowedScopes = new Set(['staging-owned', 'sibling-dependency', 'future-hard-off']);

    for (const item of FEATURE_MATRIX) {
      expect(allowedStatuses.has(item.status)).toBe(true);
      expect(allowedScopes.has(item.scope)).toBe(true);
    }
  });

  it('counts only staging-owned launch gates as staging completion failures', () => {
    const summary = getCompletionSummary();

    expect(summary.totalSystems).toBe(FEATURE_MATRIX.length);
    expect(summary.stagingOwnedSystems).toBeGreaterThan(0);
    expect(summary.launchGateFailures).toContain('Protected deployment and public staging runtime');
    expect(summary.launchGateFailures).not.toContain(
      'Consumer product visual, accessibility, localization, privacy and performance evidence',
    );
  });

  it('keeps sibling product and future device work visible without pretending Staging owns implementation', () => {
    const summary = getCompletionSummary();

    expect(summary.siblingDependencies.length).toBeGreaterThan(0);
    expect(summary.futureHardOff.length).toBeGreaterThan(0);
    expect(
      FEATURE_MATRIX.filter((item) => item.scope !== 'staging-owned').every(
        (item) => item.launchGate === false,
      ),
    ).toBe(true);
  });
});
