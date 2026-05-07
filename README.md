# urai-staging

Firebase staging backend and validation environment for the URAI Life OS project.

This repo currently owns the staging backend surface: Cloud Functions, Firestore rules, Firestore indexes, tests, CI, and deployment documentation. It does not currently contain the production UI.

## Status

Implemented in this branch:

- Firebase config for Functions, Firestore, and local emulators.
- Callable Functions: `healthCheck`, `authenticatedHealthCheck`, `adminHealthCheck`, `recordStagingEvent`, `getFeatureFlag`, `setFeatureFlag`, and `createStagingJob`.
- Shared callable auth and input validation helpers.
- Firestore rules for `staging_users`, `staging_events`, `staging_jobs`, and `staging_featureFlags`.
- Rules validation for owners, admins, feature flags, append-only events, and default-deny behavior.
- Unit tests and emulator-backed E2E-style rules tests.
- GitHub Actions CI.

Still intentionally not included:

- A real `.firebaserc`; the Firebase staging project ID must be confirmed first.
- Frontend/browser E2E tests; no UI exists in this repo yet.
- Product-specific URAI workflows beyond the core staging backend slice.

## Repo structure

| Path | Purpose |
|---|---|
| `firebase.json` | Firebase Functions, Firestore, and emulator config. |
| `firestore.rules` | Firestore security rules. |
| `firestore.indexes.json` | Firestore index manifest. |
| `functions/src/index.ts` | Callable Functions entry point. |
| `functions/src/lib/auth.ts` | Auth/admin guards. |
| `functions/src/lib/validation.ts` | Callable input validators. |
| `functions/test/` | Unit and emulator-backed tests. |
| `.github/workflows/ci.yml` | Install, typecheck, build, and test workflow. |

## Setup

```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging/functions
npm install
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
```

After the first successful install, commit `functions/package-lock.json` so CI can move from `npm install` to `npm ci`.

## Firebase project binding

This repo ships `.firebaserc.example`, not a real `.firebaserc`.

```bash
cp .firebaserc.example .firebaserc
# Replace REPLACE_WITH_FIREBASE_STAGING_PROJECT_ID with the verified staging project ID.
firebase use staging
```

Do not deploy until the staging Firebase project ID is verified.

## Scripts

From `functions/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:rules
npm run test:e2e
npm run check
```

`test:e2e` currently runs the emulator-backed Firestore security/data-flow suite because there is no browser UI in this repo.

## Callable API

| Function | Auth | Purpose |
|---|---|---|
| `healthCheck` | Public | Smoke check. |
| `authenticatedHealthCheck` | Signed-in user | Verifies callable auth context. |
| `adminHealthCheck` | `role=admin` custom claim | Verifies admin claim wiring. |
| `recordStagingEvent` | Signed-in user | Creates append-only staging events. |
| `getFeatureFlag` | Signed-in user | Reads a staging feature flag. |
| `setFeatureFlag` | `role=admin` custom claim | Creates or updates a feature flag. |
| `createStagingJob` | `role=admin` custom claim | Queues an admin staging job. |

## Deploy

```bash
firebase deploy --only functions,firestore --project staging
```

Run `LAUNCH_CHECKLIST.md` before any release-candidate validation.
