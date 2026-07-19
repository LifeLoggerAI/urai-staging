# Resume URAI Execution

Use `docs/AGENT_HANDOFF_CURRENT_STATE_2026-07-19.md` as the starting record.

## First actions

1. Open `LifeLoggerAI/urai-spatial` pull request `#793`.
2. Read the actual current head SHA from GitHub.
3. Do not assume the snapshot SHA is still current.
4. Fetch all workflow runs tied to the actual head.
5. Treat older-head artifacts as historical only.
6. Inspect failed or cancelled runs and their retained artifacts.
7. Fix only defects proven by logs, receipts, screenshots or source inspection.
8. Re-run the complete applicable workflow set on one unchanged head.
9. Confirm all review threads are resolved.
10. Obtain an eligible non-author approval before merge.
11. Merge with expected-head SHA protection.
12. Deploy only through the protected release path.
13. Verify the exact merged SHA, public routes, monitoring and rollback.
14. Update the canonical Google Drive launch and evidence records.

## Snapshot reference

At the time the handoff was written:

- Candidate PR: `LifeLoggerAI/urai-spatial#793`
- Candidate branch: `product/canonical-seven-fix-clean-r3-20260718`
- Snapshot candidate SHA: `c7fd34206e746973ece255cf44dec3d031ccc3df`
- Status: draft, unmerged and undeployed
- Unresolved review threads: none observed
- Eligible non-author approval: not observed

Never represent the snapshot SHA as current without verifying it again.

## Truth boundary

A passing build or source-level test does not prove merge, deployment, public availability, independent review or rollback protection.
