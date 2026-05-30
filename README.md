# urai-staging

Firebase staging backend and validation environment for the URAI Life OS project.

This repo owns the canonical URAI staging backend and validation shell at:

```text
LifeLoggerAI/urai-staging
```

The staging Firebase project is locked to:

```text
urai-staging
```

The live staging URL target is:

```text
https://urai-staging.web.app
```

This repo does not own the full production UI. It owns the smoke-testable Firebase Hosting shell, Cloud Functions, Firestore rules, Storage rules, indexes, tests, CI, and staging lock documentation.

## Public staging visibility note

This repository is currently public and documents staging infrastructure, URLs, routes, callable APIs, and readiness evidence. Before Genesis or production launch, confirm whether this repo should remain public. If it remains public, keep it limited to staging-safe code, public test surfaces, documentation, examples, and non-sensitive configuration only.

Do not commit real secrets, service-account files, production data, private user data, internal incident evidence, raw operational exports, or screenshots/logs containing identifiers. Staging endpoints must remain isolated from production data and protected where auth or admin claims are required.

## Status

Implemented in this branch:

- Explicit Firebase aliases for `default`, `staging`, and `production` with staging locked to `urai-staging`.
- Firebase Hosting shell in `public/index.html`, now presented as a URAI V1-aligned staging surface with orb, ground layer, companion smoke framing, reduced-motion support, and smoke endpoint links.
- Hosting rewrites for `/api/healthz`, `/api/buildinfo`, `/api/companion`, and `/api/waitlist`.
- Callable Functions: `healthCheck`, `authenticatedHealthCheck`, `adminHealthCheck`, `recordStagingEvent`, `getFeatureFlag`, `setFeatureFlag`, `createStagingJob`, and `getStagingCompletionMatrix`.
- HTTP smoke endpoints for live staging verification.
- Firestore rules for `staging_users`, `staging_events`, `staging_jobs`, and `staging_featureFlags`.
- Storage rules with default-deny behavior.
- Rules validation for owners, admins, feature flags, append-only events, and default-deny behavior.
- Unit tests and emulator-backed E2E-style rules tests.
- Staging readiness checker, deploy lock script, and smoke script.
- System-of-systems readiness matrix, launch blocker checklist, definition of done, deployment guide, system audit, test report, environment notes, and release notes.

Still intentionally not included:

- Full URAI production UI.
- Frontend/browser E2E tests for the product app.
- External URAI modules owned by sibling repos, unless they provide their own deploy evidence.

## Repo structure

| Path | Purpose |
|---|---|
| `package.json` | Root command pass-throughs into `functions/` and staging lock scripts. |
| `.idx/dev.nix` | Firebase Studio / IDX environment packages, including Java for Firestore emulator. |
| `firebase.json` | Firebase Hosting, Functions, Firestore, Storage, and emulator config. |
| `.firebaserc` | Firebase project aliases for this workspace. |
| `public/index.html` | URAI staging validation shell. |
| `firestore.rules` | Firestore security rules. |
| `firestore.indexes.json` | Firestore index manifest. |
| `storage.rules` | Firebase Storage security rules. |
| `functions/src/index.ts` | Callable and HTTP Functions entry point. |
| `functions/src/lib/auth.ts` | Auth/admin guards. |
| `functions/src/lib/validation.ts` | Callable input validators. |
| `functions/test/` | Unit and emulator-backed tests. |
| `scripts/check-deploy-readiness.mjs` | Static readiness validation for staging deploy. |
| `scripts/urai-staging-lock.sh` | Locked staging deploy script. |
| `scripts/smoke-staging.sh` | Live smoke script. |
| `SYSTEM_AUDIT.md` | Architecture, security, readiness, and known-limitations audit. |
| `TEST_REPORT.md` | Runtime verification matrix and required evidence. |
| `DEPLOYMENT.md` | Safe staging deploy guide. |
| `ENVIRONMENT.md` | Runtime, Firebase, emulator, and environment guidance. |
| `RELEASE_NOTES.md` | Release-candidate change log. |
| `URAI_STAGING_CANONICAL_APP.md` | Canonical staging app decision. |
| `URAI_STAGING_READINESS_MATRIX.md` | System-of-systems readiness matrix. |
| `URAI_STAGING_LAUNCH_BLOCKERS.md` | Launch blockers and fix priorities. |
| `URAI_STAGING_DEFINITION_OF_DONE.md` | Final staging completion checklist. |
| `.github/workflows/ci.yml` | Install, typecheck, build, and test workflow. |

## Firebase Studio / IDX setup

This workspace uses Nix. Do not install Java with `sudo apt-get` in Firebase Studio. Java is provided by `.idx/dev.nix`:

```nix
pkgs.openjdk17
```

After pulling changes, rebuild or restart the Firebase Studio workspace, then verify:

```bash
java -version
```

## Setup

From the repo root:

```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
npm --prefix functions ci
npm run check:deploy
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
```

## Firebase project binding

The active staging project must be:

```bash
firebase use urai-staging
firebase use
```

## Scripts

From the repo root:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:rules
npm run test:e2e
npm run check
npm run check:deploy
npm run smoke:staging
npm run deploy:staging
```

`deploy:staging` delegates to `scripts/urai-staging-lock.sh` and refuses to deploy anywhere except `urai-staging`.

## HTTP smoke API

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Hosting shell smoke. |
| `/u/adamclamp` | GET | Route rewrite smoke. |
| `/api/healthz` | GET | Live health check. |
| `/api/buildinfo` | GET | Build/project metadata smoke. |
| `/api/companion` | POST | Companion endpoint smoke and invalid-message guard. |
| `/api/waitlist` | POST | Staging waitlist write smoke. |

## Callable API

| Function | Auth | Purpose |
|---|---|---|
| `healthCheck` | Public | Callable smoke check. |
| `authenticatedHealthCheck` | Signed-in user | Verifies callable auth context. |
| `adminHealthCheck` | `role=admin` custom claim | Verifies admin claim wiring. |
| `recordStagingEvent` | Signed-in user | Creates append-only staging events. |
| `getFeatureFlag` | Signed-in user | Reads a staging feature flag. |
| `setFeatureFlag` | `role=admin` custom claim | Creates or updates a feature flag. |
| `createStagingJob` | `role=admin` custom claim | Queues an admin staging job. |
| `getStagingCompletionMatrix` | `role=admin` custom claim | Returns the repo's completion matrix payload. |

## Deploy

```bash
npm run deploy:staging
```

After the script passes, commit the generated `URAI_STAGING_LOCK.md` if you want the lock evidence preserved in git.
