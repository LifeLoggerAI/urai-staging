# Environment Map

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging

## Canonical staging binding

| Surface | Value | Source |
|---|---|---|
| Firebase project | `urai-staging` | `.firebaserc`, `functions/src/index.ts`, scripts |
| Hosting site | `urai-staging` | `firebase.json`, deploy lock script |
| Staging URL | `https://urai-staging.web.app` | README, functions, scripts |
| Production alias | `urai-4dc1d` | `.firebaserc`, `.env.example` documentation only |
| Node runtime | `20` | root and functions package manifests |
| Public shell | `public/index.html` | Firebase Hosting public directory |

## Repository type

This is a Firebase staging validation workspace. It is not the full production app. It contains a public static Hosting shell, Cloud Functions, Firestore rules, Storage rules, indexes, tests, CI, and deployment-lock scripts.

## Hosting routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Hosting shell | Staging validation surface |
| `/u/adamclamp` | SPA fallback | Route rewrite smoke |
| `/api/healthz` | Function rewrite | Live health smoke |
| `/api/buildinfo` | Function rewrite | Build/project metadata smoke |
| `/api/companion` | Function rewrite | Companion smoke endpoint; not full AI provider proof |
| `/api/waitlist` | Function rewrite | Staging waitlist persistence smoke |

## Callable functions

| Function | Access | Purpose |
|---|---|---|
| `healthCheck` | public callable | Functions reachability smoke |
| `authenticatedHealthCheck` | authenticated user | Auth context proof |
| `adminHealthCheck` | admin custom claim | Admin claim proof |
| `recordStagingEvent` | authenticated user | Append-only staging event creation |
| `getFeatureFlag` | authenticated user | Staging feature flag read |
| `setFeatureFlag` | admin custom claim | Staging feature flag write |
| `createStagingJob` | admin custom claim | Staging job queue record creation |
| `getStagingCompletionMatrix` | admin custom claim | Completion matrix payload |

## Firestore separation

Staging collections:
- `staging_users`
- `staging_events`
- `staging_jobs`
- `staging_featureFlags`
- server-written `staging_waitlist`

Firestore rules include a default-deny catch-all. Owner/admin checks gate scoped collections. Public direct Firestore access to arbitrary documents is denied.

## Storage separation

Storage rules expose:
- owner-scoped `staging_users/{userId}/...`
- publicly readable but admin-writable `staging_public/...`
- admin-only `staging_admin/...`
- default-deny catch-all

## Deployment controls

`npm run deploy:staging` delegates to `npm run lock:staging`, which runs `scripts/urai-staging-lock.sh`. The lock script refuses a mismatched `URAI_STAGING_PROJECT_ID`, refuses deployment when `URAI_PRODUCTION_DEPLOY_APPROVED=1`, selects `urai-staging`, verifies/creates the staging Hosting site, runs checks/tests, deploys explicit staging targets, runs smoke tests, and writes `URAI_STAGING_LOCK.md` only after success.

## What staging does not control

- Production deploys.
- Production user data.
- Sibling URAI repos' product route completeness.
- Full URAI UI readiness.
- Live AI provider readiness beyond smoke framing.
