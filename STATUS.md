# URAI Staging Current Status

Date: 2026-09-24  
Repo: `LifeLoggerAI/urai-staging`

## Current classification

**SOURCE CONVERGENCE ACTIVE / PROTECTED RUNTIME NO-GO / LIVE CERTIFICATION NOT COMPLETE**

URAI Staging is the internal, non-production verification and provider-sandbox control plane for the URAI estate. It is not a production application and must not be presented as a public URAI destination.

## Current source authority

- Default branch: `main`
- Base main at this reconciliation: `650f9ec9755727605681a109947209b668e8539e`
- Current convergence successor: PR #44
- PR #44 is the intended successor to the split Spatial/Stripe PR #40 and Communications/Twilio PR #43 after exact-head CI succeeds.
- Active consumer authority is machine-readable in `config/staging-consumers.json`.
- Active consumer refs are re-resolved in CI and must fail closed when an upstream ref moves.
- Historical Admin PR #57 authority is retained as provenance only and is not an active consumer.

## Current runtime truth

At the 2026-09-24 audit checkpoint:

- `https://urai-staging.web.app/` returned HTTP 503.
- `/api/healthz` returned HTTP 503.
- `/api/buildinfo` returned HTTP 503.
- `/robots.txt` remained reachable but did not match the canonical all-disallow staging source.

Therefore the current deployed revision is **not certified** and source-green evidence must not be described as a healthy staging runtime.

## Current implemented guardrails

- Canonical Firebase project: `urai-staging`.
- Production alias is absent.
- Production project selection is rejected by staging controls.
- Synthetic/test data is required for active consumer lanes.
- WIF/OIDC is the intended protected cloud authentication path.
- Service-account JSON and long-lived provider credentials are not authorized by the staging control plane.
- Spatial/Stripe lane is TEST-only and provider-read-only.
- Communications/Twilio lane is trial-only, one verified recipient, explicit function allowlist, and mandatory rollback to delivery disabled.
- Node 22 is the current intended Staging runtime on PR #44.
- Public HTTP endpoints enforce a staging-origin allowlist and bounded request bodies on PR #44.
- Source bootstrap evidence is named `sourceBootstrapScore`; it is not a launch/runtime score.
- Product UI, visual canon, accessibility implementation, localization implementation, privacy implementation, and other product systems remain owned by their sibling repositories. Staging consumes their exact-head receipts; it does not duplicate them.

## Required before READY

1. PR #44 exact-head CI and Production Verify terminal-success.
2. Final active upstream heads frozen and matching the consumer registry.
3. Independent exact-head review on the unchanged accepted head.
4. Main branch/repository release protections verified by repository administration.
5. Protected `staging` WIF/IAM authority proven with least privilege and no long-lived keys.
6. Read-only provider diagnosis identifies the current 503 root cause and currently serving revision.
7. Exact accepted merged-main candidate deployed to `urai-staging`.
8. `/api/buildinfo` reports the exact deployed SHA, deployment timestamp, workflow run and provider identity.
9. Root, robots, health, buildinfo and bounded write smoke pass.
10. Unauthorized origin/write and cross-user/tenant denial evidence passes.
11. Monitoring, failure/recovery and distinct rollback evidence passes.
12. Final retained artifacts are inspected and canonical documentation is refreshed.

## Truth rule

`CODE COMPLETE != SYSTEM COMPLETE != DEPLOYED != LIVE VERIFIED`

No predecessor workflow, review, screenshot, provider receipt or deployment receipt transfers across a changed authority without explicit revalidation.
