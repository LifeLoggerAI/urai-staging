# UrAi Cross-System Canon Authority

Status: ADOPTION CANDIDATE — becomes binding cross-system authority only after the current Labs canon successor is legitimately merged.

Repository role: **non-production staging and TEST-only provider bridge**

## Upstream authority

Cross-system canon candidate:
- Repository: `LifeLoggerAI/urai-labs-llc`
- PR: `#102`
- Canon path: `docs/canon/`

PR #102 is the current main-target consolidated canon candidate. Labs #107 is a sibling rebase onto the Labs convergence branch and does not replace #102 as downstream mainline authority.

Until #102 is legitimately merged, Staging's current merged runtime/release contracts and the active #44 machine registry remain authoritative for implementation facts. This adoption file transfers no certification, review, deployment, provider, legal, financial, Gold-Master, runtime, or exact-head evidence.

Authority regression guard: closed/superseded Labs #101 or sibling #107 must not replace #102 as downstream mainline authority unless #102 is explicitly superseded by a newer main-target canon PR.

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

After upstream PR #102 merges, reconcile Staging's active consumer registry, provider boundaries and release contracts against the merged canon. Classify conflicts as RESOLVED, DEFERRED with an external blocker, or SUPERSEDED with provenance retained.
