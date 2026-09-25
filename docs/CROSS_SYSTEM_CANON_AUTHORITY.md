# UrAi Cross-System Canon Authority

Status: ADOPTION CANDIDATE — becomes binding cross-system authority only after the current Labs canon successor is legitimately merged.

Repository role: **non-production staging and TEST-only provider bridge**

## Upstream authority

Cross-system canon candidate:
- Repository: `LifeLoggerAI/urai-labs-llc`
- PR: `#107`
- Exact head observed at reconciliation: `e100bbfa2336358b4eb949d2411fe786baddfc3d`
- Canon path: `docs/canon/`

PR #107 is the current zero-ambiguity canon successor. Earlier Labs canon candidates, including #101 and #102, are provenance only where superseded.

Until #107 is legitimately merged, Staging's current merged runtime/release contracts and the active #44 machine registry remain authoritative for implementation facts. This adoption file transfers no certification, review, deployment, provider, legal, financial, Gold-Master, runtime, or exact-head evidence.

Authority regression guard: any later reintroduction of Labs #101/#102 as current Staging canon authority is stale and must fail review rather than silently supersede this line.

## Local invariants

- Staging fails closed and must not alias canonical production.
- Production identifiers may appear only as prohibited/reference values in safety checks.
- TEST-only provider state cannot be substituted with LIVE evidence.
- Stripe remains TEST-only; Twilio remains trial/synthetic-only unless separately authorized and proven.
- Long-lived credentials, broad production mutation, production customer data and LIVE provider activation remain unauthorized.
- Active consumer SHAs remain governed by `config/staging-consumers.json`; canon adoption cannot silently repin them.

## Evidence integrity

- exact-head evidence never transfers after a head move;
- queued/pending/skipped/cancelled/stale is not success;
- predecessor approval does not approve a successor SHA;
- provider LIVE state is never inferred from source configuration;
- green CI alone is not Gold Master.

## Conflict order

Verified runtime -> merged implementation -> exact-head release evidence -> local contracts/machine registry -> merged cross-system canon -> planning/history.

## Required adoption action

After upstream PR #107 merges, reconcile Staging's active consumer registry, provider boundaries and release contracts against the merged canon. Classify conflicts as RESOLVED, DEFERRED with an external blocker, or SUPERSEDED with provenance retained.
