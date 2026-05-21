# URAI Staging Repo Map

Updated: 2026-05-21

## Repository role

`LifeLoggerAI/urai-staging` owns the Firebase staging backend and validation shell for URAI. It does not currently contain the full production Next.js app or the rich HomeView/Life Map implementation.

## Framework and runtime

- Runtime: Node 20
- Backend: Firebase Cloud Functions for Node
- Hosting: Firebase Hosting static shell from `public/`
- Database: Cloud Firestore
- Storage: Firebase Storage
- Test tooling: TypeScript, Vitest, Firebase emulator rules tests

## Important files

| Path | Purpose |
| --- | --- |
| `package.json` | Root command aliases and launch gates. |
| `firebase.json` | Firebase Hosting, Functions, Firestore, Storage, and emulator configuration. |
| `.firebaserc` | Firebase project aliases. |
| `public/index.html` | Static staging shell with URAI orb, ground, and smoke links. |
| `functions/package.json` | Functions build/test dependencies and scripts. |
| `functions/src/index.ts` | HTTP and callable Cloud Functions. |
| `functions/src/lib/auth.ts` | Auth and admin guard helpers. |
| `functions/src/lib/validation.ts` | Input validation helpers. |
| `functions/src/lib/featureRegistry.ts` | Staging feature/readiness matrix. |
| `functions/test/` | Unit and Firestore rules tests. |
| `firestore.rules` | Firestore security rules. |
| `storage.rules` | Firebase Storage security rules. |
| `firestore.indexes.json` | Firestore indexes manifest. |
| `scripts/check-deploy-readiness.mjs` | Static staging deploy readiness check. |
| `scripts/check-lockfile.mjs` | Lockfile/engine validator. |
| `scripts/launch-p0.mjs` | URAI P0 command gate. |
| `scripts/urai-staging-lock.sh` | Staging-only deploy script. |
| `scripts/smoke-staging.sh` | Live staging smoke script. |

## Routes and rewrites

Firebase Hosting rewrites:

| Route | Target | Purpose |
| --- | --- | --- |
| `/api/companion` | Cloud Function `companion` | Companion smoke endpoint. |
| `/api/waitlist` | Cloud Function `waitlist` | Waitlist write smoke endpoint. |
| `/api/healthz` | Cloud Function `healthz` | Live health endpoint. |
| `/api/buildinfo` | Cloud Function `buildinfo` | Build/project metadata endpoint. |
| `**` | `/index.html` | Static shell route fallback, including `/u/adamclamp`. |

## Data paths currently implemented

| Path | Access model |
| --- | --- |
| `staging_users/{userId}` | Owner-only read/write. |
| `staging_events/{eventId}` | Signed-in append-only create; no client read/update/delete. |
| `staging_jobs/{jobId}` | Admin-only. |
| `staging_featureFlags/{flag}` | Signed-in read; admin write. |
| `staging_waitlist/{email}` | Written by Cloud Function with Admin SDK; no direct client rule path. |

## Missing from this repo

The following are not implemented as first-class product app routes in this repo:

- Next.js app router
- `/home`, `/life-map`, `/memory/[id]`, `/replay/[eraId]`, `/cognitive-mirror`, `/journal`, `/narrator`, `/settings/privacy`
- Rich Home Orb React component
- Firestore client hooks for HomeWorld state
- Production AI provider integration
- Browser E2E tests against full product UI

These appear to be owned by sibling repos such as `LifeLoggerAI/UrAi`, `LifeLoggerAI/UrAiProd`, and `LifeLoggerAI/UrAi-Dev`.
