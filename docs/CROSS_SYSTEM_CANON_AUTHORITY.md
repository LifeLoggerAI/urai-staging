# UrAi Cross-System Canon Authority

Status: ADOPTION CANDIDATE — becomes binding cross-system authority only after the upstream Labs canon successor is legitimately merged.

Repository role: **non-production staging and TEST-only provider bridge**

## Upstream authority

Current cross-system canon candidate:
- Repository: `LifeLoggerAI/urai-labs-llc`
- PR: `#107`
- Exact head observed at adoption: `e100bbfa2336358b4eb949d2411fe786baddfc3d`
- Canon path: `docs/canon/`

PR #107 is the current zero-ambiguity canon successor rebuilt onto the active Labs convergence base. Older canon candidates, including #102, remain provenance only where superseded.

Until the upstream canon is legitimately merged and adopted, this repository's current merged runtime/release contracts remain authoritative for implementation facts. This adoption file does not transfer certification, review, deployment, provider, Gold-Master, runtime, or exact-head evidence between repositories.

## Local invariants

- Staging must fail closed and must not alias canonical production.
- Production identifiers may appear only as prohibited/reference values in safety checks.
- TEST-only provider state cannot be substituted with LIVE evidence.
- Active consumer SHAs remain governed by `config/staging-consumers.json`; upstream canon adoption cannot silently repin them.
- No cross-system canon document can grant provider mutation, deployment, production-data, or billing authority.

## Conflict resolution

Use this order:
1. verified live runtime for runtime facts;
2. merged production source for implementation facts;
3. exact-head release/deployment evidence;
4. local canonical contracts/schemas;
5. merged cross-system UrAi Canon Bible;
6. roadmaps/planning/history.

If runtime conflicts with product canon because runtime is defective, record a defect; do not silently redefine canon.

## Evidence integrity

- exact-head evidence never transfers after a head move;
- queued/pending/skipped/cancelled/stale is not success;
- predecessor approval does not approve a successor SHA;
- provider LIVE state is never inferred from source configuration;
- green CI alone is not Gold Master;
- future source code may exist only under the repository's approved hard-off/fail-closed boundary.

## Required adoption action

After upstream PR #107 merges, reconcile this repository's local docs/contracts against the merged canon and classify every conflict as RESOLVED, DEFERRED with an external blocker, or SUPERSEDED with preserved historical provenance.
