# URAI Technical Agent Handoff — 2026-07-19

## Purpose

This document is the durable technical handoff for the URAI ecosystem. Another AI agent, engineer, reviewer, or trusted collaborator should begin here rather than reconstructing state from chat history.

This is not a production-completion certificate. It records exact technical authority, completed repairs, current evidence, open gates, and the required resume order.

## Canonical product authority

- Repository: `LifeLoggerAI/urai-spatial`
- Application root: `urai-tier1`
- Protected production branch: `main`
- Verified production before the active candidate: `1770a4967e7501d82d55385c9584a8f24231eced`
- Active convergence pull request: `LifeLoggerAI/urai-spatial#793`
- Active branch at this snapshot: `product/canonical-seven-fix-clean-r3-20260718`
- Exact candidate at this snapshot: `c7fd34206e746973ece255cf44dec3d031ccc3df`
- State at snapshot: open, draft, mergeable, unmerged, undeployed

Always fetch the current PR head before resuming. Never assume the recorded SHA is still current.

## Completed repairs

### Native doorway proof

The proof harness previously searched for retired controls. It was updated to exercise the current visible Home controls:

- `Open Ground directly`
- `Open Life Map directly`

Coverage retained:

- desktop pointer
- desktop keyboard
- mobile touch
- minimum hit-target enforcement

The repaired Native Doorway Proof passed on the subsequent exact head.

### Current-canon visual audit

The exact-head AAA receipt isolated stale audit assumptions rather than failed routes:

1. old Home copy markers remained in the generated audit;
2. Life Map to Focus attempted to use a hidden accessibility menu rather than the visible selected-memory portal.

`scripts/run-live-visual-audit-current.mjs` was hardened to:

- use current Home, Ground, Life Map, Status and XR markers;
- exercise visible direct Home controls;
- select the visible `The Quiet Reset` memory;
- validate selected-surface containment;
- validate a minimum 44-pixel Focus target;
- verify the hidden overview semantic list does not compete with selected mode;
- enter Focus through `.life-map-memory-portals`;
- fail immediately if retired contracts survive transformation.

## Exact-head workflow status at snapshot

Successful on `c7fd34206e746973ece255cf44dec3d031ccc3df`:

- Guardian Diagnostics
- Export Spatial E2E Source
- Asset Pack Independent Ledger
- URAI Spatial Copy Policy
- Frozen Lockfile Check
- Privacy adoption check
- Spatial Performance Budget
- Release Security Path Guard
- URAI Automated Receipt Ledger
- XR Static Gate Diagnostics
- Firebase Preview
- Patch Check
- Spatial Missing Resource Diagnostics
- URAI Spatial CI
- v60 CI
- Native Doorway Proof
- URAI Production Verify
- URAI Spatial Release Readiness

Still running at the latest inspection:

- URAI Canonical Production Release gate
- URAI Spatial Verify
- Workflow Phase Boundaries / exact PR-head AAA proof

Cancelled at the latest inspection and therefore not certifying the candidate:

- Continuous Spatial Visual Proof
- Accessibility Performance Evidence

A cancelled workflow is not a pass. Determine whether cancellation came from concurrency or a newer replacement run. Re-run on the unchanged exact head when no replacement terminal-success receipt exists.

## Review state at snapshot

- Existing inline review threads: resolved
- Fresh automated review: requested against the exact candidate
- Eligible non-author human approval: not evidenced

## Required resume procedure

1. Fetch PR #793 and record its actual head SHA.
2. Fetch every workflow run for that actual head.
3. Treat all older-head evidence as historical only.
4. Inspect failures, cancellations, logs and retained artifacts.
5. Repair only proven defects on the canonical branch.
6. Require every applicable workflow to reach terminal success on one unchanged head.
7. Confirm no unresolved review threads.
8. Obtain an eligible non-author human approval on the final exact head.
9. Confirm mergeable and zero behind protected `main`.
10. Merge using expected-head SHA protection.
11. Deploy only through the protected canonical release workflow.
12. Verify the exact merged SHA, public host fingerprint, critical routes, monitoring and rollback.
13. Update the canonical Drive launch and evidence registers with exact receipts.

## System-of-systems boundary

Spatial success does not certify the complete ecosystem. These services require independent exact-source, runtime, integration and rollback evidence:

- Admin
- Privacy
- Jobs
- Analytics
- Communications
- Content
- Studio
- Storytime
- RuAI / B2B portal
- Asset Factory
- Staging
- Marketing
- Investor surface
- corporate public surface
- Foundation public surface

`LifeLoggerAI/urai-staging` is the canonical integration and cross-service validation authority. It does not own the production product UI.

## Truth rules

Never claim:

- merged when unmerged;
- deployed when only built;
- live when only staged;
- production-certified when only source-green;
- independently reviewed when self-reviewed;
- rollback-protected without a tested rollback receipt.

## Current verdict

`NO-GO` for full ecosystem production at this snapshot.

The active product candidate still requires complete terminal exact-head evidence, replacement evidence for cancelled workflows, eligible human approval, protected merge, exact deployment verification and supporting-service integration proof.
