# URAI XR Release Train Staging Gate

This file records what `LifeLoggerAI/urai-staging` must prove before `LifeLoggerAI/urai-spatial` or related URAI repos can claim production-live, AR, VR, or XR readiness.

## Current status

- Staging gate status: `required-before-production-live`.
- Canonical staging project: `urai-staging`.
- Canonical staging URL: `https://urai-staging.web.app`.
- Canonical consumer: `LifeLoggerAI/urai-spatial` and future native XR clients.
- Production-live claim status: blocked until staging deploy, smoke, rules, callable/API, rollback, and release-train evidence are recorded.

## Required release-train evidence

| Gate | Required evidence | Result | Notes |
| --- | --- | --- | --- |
| Static deploy readiness | `npm run check:deploy` | Not recorded | Must prove the repo is still bound to `urai-staging`. |
| Full repo check | `npm run check` | Not recorded | Includes lint/typecheck/build/test coverage defined by this repo. |
| Rules and E2E | `npm run test:rules` and `npm run test:e2e` | Not recorded | Required before backend trust claims. |
| Locked staging deploy | `npm run deploy:staging` and generated `URAI_STAGING_LOCK.md` | Not recorded | Must refuse non-staging targets. |
| Live staging smoke | `npm run smoke:staging` against `https://urai-staging.web.app` | Not recorded | Required before `urai-spatial` live smoke can be trusted as release-train evidence. |
| Callable/API smoke | `/api/healthz`, `/api/buildinfo`, `/api/companion`, `/api/waitlist`, and callable functions | Not recorded | Required before API readiness claims. |
| Admin/auth boundary | Signed-in and `role=admin` callable checks | Not recorded | Required before admin release controls. |
| Rollback reference | Rollback SHA/procedure for staging release candidate | Not recorded | Required before production approval. |
| Public repo safety | Confirmation that public staging docs contain no secrets/private data | Not recorded | Required because this repo is public. |

## Integration contract for URAI Spatial

`urai-spatial` must keep deployment/live-smoke rows as `Not recorded` until this repo provides:

1. Passing deploy-readiness evidence.
2. Passing repo check evidence.
3. Passing rules/E2E evidence.
4. Locked staging deploy evidence.
5. Live staging smoke evidence.
6. Rollback reference.
7. Public-repo safety review.

## XR release-train rule

Quest, WebXR, visionOS, and handheld AR release candidates must pass through this staging evidence gate before any production-live claim, even if their device/provider evidence is recorded in sibling repos.

## Release decision

Do not use this file to mark staging complete by itself. The authoritative staging evidence remains `URAI_STAGING_LOCK.md`, `URAI_STAGING_READINESS_MATRIX.md`, `URAI_STAGING_LAUNCH_BLOCKERS.md`, `URAI_STAGING_DEFINITION_OF_DONE.md`, `TEST_REPORT.md`, deploy logs, smoke output, and CI artifacts.
