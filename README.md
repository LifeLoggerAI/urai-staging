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

## Current status

**DONE BUT NEEDS EXTERNAL ENV / RUNNER.**

Repo-side staging completion work is implemented and guarded, but this repo must not be marked READY until GitHub Actions or another deploy-capable runner produces current receipts for install, lint, typecheck, build, unit tests, Firestore emulator tests, deploy lock if requested, and live smoke if deployed.

Latest last-mile proof path:

```text
launch-proof/urai-staging-production-lock/2026-06-30T0000Z/
```

Latest repo-side completion commits include:

- `5d6f952ffc1309c92db2d73ec116c0da11ba1bb9` - adaptive Java runner for emulator tests.
- `1d7e065f0c8f484e1ae702b16dd2fd214323473a` - root emulator scripts use adaptive Java runner.
- `d42b9ee6fcaa6f8ee4cad96e685e428c00f8e1b7` - deploy-readiness checker enforces staging disclaimers, robots block, and adaptive runner.
- `cf9f0bbf48409b640ef1d316a5ac61bb882df266` - last-mile completion receipt.

## Implemented in this branch

- Explicit Firebase aliases for `default`, `staging`, and `production` with staging locked to `urai-staging`.
- Firebase Hosting shell in `public/index.html`, presented as a URAI V1-aligned staging surface with orb, ground layer, companion smoke framing, reduced-motion support, smoke endpoint links, and a visible not-production staging disclaimer.
- `public/robots.txt` blocks indexing for the staging environment.
- Hosting rewrites for `/api/healthz`, `/api/buildinfo`, `/api/companion`, and `/api/waitlist`.
- Callable Functions: `healthCheck`, `authenticatedHealthCheck`, `adminHealthCheck`, `recordStagingEvent`, `getFeatureFlag`, `setFeatureFlag`, `createStagingJob`, and `getStagingCompletionMatrix`.
- HTTP smoke endpoints for live staging verification.
- Firestore rules for `staging_users`, `staging_events`, `staging_jobs`, and `staging_featureFlags`.
- Storage rules with default-deny behavior.
- Rules validation for owners, admins, feature flags, append-only events, and default-deny behavior.
- Unit tests and emulator-backed E2E-style rules tests.
- Adaptive Java runner for emulator/rules tests in Firebase Studio, IDX, local shells, and GitHub Actions.
- Staging readiness checker, deploy lock script, smoke script, CI evidence artifact workflow, and gated manual staging deploy workflow.
- System-of-systems readiness matrix, launch blocker checklist, definition of done, deployment guide, system audit, test report, environment notes, release notes, and timestamped launch-proof receipts.

Still intentionally not included:

- Full URAI production UI.
- Frontend/browser E2E tests for the product app.
- External URAI modules owned by sibling repos, unless they provide their own deploy evidence.
- Production deployment.

## Repo structure

| Path | Purpose |
|---|---|
| `package.json` | Root command pass-throughs into `functions/`, adaptive emulator scripts, and staging lock scripts. |
| `.idx/dev.nix` | Firebase Studio / IDX environment packages, including Java for Firestore emulator. |
| `.github/workflows/ci.yml` | Install, typecheck, build, tests, and launch-evidence artifact workflow. |
| `.github/workflows/staging-deploy.yml` | Manual gated staging deploy-lock workflow. |
| `firebase.json` | Firebase Hosting, Functions, Firestore, Storage, and emulator config. |
| `.firebaserc` | Firebase project aliases for this workspace. |
| `public/index.html` | URAI staging validation shell with visible staging disclaimer. |
| `public/robots.txt` | Blocks crawler indexing for staging. |
| `firestore.rules` | Firestore security rules. |
| `firestore.indexes.json` | Firestore index manifest. |
| `storage.rules` | Firebase Storage security rules. |
| `functions/src/index.ts` | Callable and HTTP Functions entry point. |
| `functions/src/lib/auth.ts` | Auth/admin guards. |
| `functions/src/lib/validation.ts` | Callable input validators. |
| `functions/test/` | Unit and emulator-backed tests. |
| `scripts/run-with-java.sh` | Java/Nix compatibility wrapper for emulator-backed commands. |
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

## Firebase Studio / IDX setup

This workspace uses Nix. Do not install Java with `sudo apt-get` in Firebase Studio. Java is provided by `.idx/dev.nix`:

```nix
pkgs.openjdk17
```

After pulling changes, rebuild or restart the Firebase Studio workspace, then verify:

```bash
java -version
```

Outside Firebase Studio/IDX, `scripts/run-with-java.sh` will use an existing Java runtime when `nix-shell` is unavailable.

## Setup

From the repo root:

```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
npm install
npm --prefix functions ci
npm run doctor
npm run check:deploy
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:rules
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
npm run doctor
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

## GitHub Actions receipts

CI path:

- Workflow: `CI`
- Artifact: `urai-staging-launch-evidence`
- Expected files: `artifacts/launch/staging-bootstrap-report.json`, `artifacts/launch/staging-bootstrap-summary.md`

Manual staging deploy-lock path:

- Workflow: `Staging Deploy Lock`
- Dispatch input `confirm_staging_project`: `urai-staging`
- Dispatch input `run_live_deploy`: `false` for checks-only proof, `true` for full staging deploy-lock proof when the staging deploy environment is configured.
- Artifact: `urai-staging-deploy-lock-evidence`

## HTTP smoke API

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Hosting shell smoke. |
| `/u/adamclamp` | GET | Route rewrite smoke. |
| `/robots.txt` | GET | Confirms staging indexing block. |
| `/api/healthz` | GET | Live health check. |
| `/api/buildinfo` | GET | Build/project metadata smoke. |
| `/api/companion` | POST | Companion endpoint smoke and invalid-message guard. |
| `/api/waitlist` | POST | Staging waitlist write smoke using synthetic data only. |

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

After the script passes, preserve the generated `URAI_STAGING_LOCK.md` or the `urai-staging-deploy-lock-evidence` artifact as the deployment receipt.
