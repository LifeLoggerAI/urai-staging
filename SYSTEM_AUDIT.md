# URAI Staging System Audit

Date: 2026-05-20
Branch: release/urai-staging-v1-integration-audit
Repository: LifeLoggerAI/urai-staging

## Scope

This audit covers the canonical `urai-staging` repository. The repository is a Firebase staging backend, validation shell, and deployment lock surface for URAI. It does not contain the full Next.js/React production product UI; that product surface is owned by sibling URAI repos. The staging repo is expected to prove Firebase Hosting, Cloud Functions, Firestore rules, Storage rules, indexes, smoke endpoints, admin/auth callable gates, and staging deploy safety.

## Architecture Map

- Root package: command pass-throughs into `functions/` plus staging lock, smoke, emulator, and deploy-readiness scripts.
- Hosting: static `public/index.html` shell with rewrites for `/api/healthz`, `/api/buildinfo`, `/api/companion`, `/api/waitlist`, and SPA fallback.
- Functions: TypeScript Cloud Functions in `functions/src/index.ts`.
- Validation: shared callable input validation in `functions/src/lib/validation.ts`.
- Auth: callable auth/admin guards in `functions/src/lib/auth.ts`.
- Feature matrix: `functions/src/lib/featureRegistry.ts` powers the admin completion matrix endpoint.
- Firestore: staging collections include `staging_users`, `staging_events`, `staging_jobs`, `staging_featureFlags`, and server-written `staging_waitlist`.
- Storage: owner/admin/public staging buckets with default-deny fallback.
- CI: GitHub Actions installs Functions dependencies, typechecks, builds, runs unit tests, and runs emulator-backed rules tests.
- Deploy: `scripts/urai-staging-lock.sh` gates install, readiness check, lint, typecheck, build, unit tests, optional emulator tests, Firebase deploy, live smoke, and lock report generation.

## Current Findings

### Framework and package system

- Root is not a product frontend app. It is a Firebase staging validation workspace.
- Root package manager is npm; root scripts delegate to `npm --prefix functions`.
- Functions runtime uses Node 20.
- Functions build is TypeScript via `tsc`.
- Unit/rules tests use Vitest plus Firebase emulator tooling.

### Firebase and deployment

- `.firebaserc` binds `default` and `staging` to `urai-staging`; production points elsewhere.
- `firebase.json` deploys Hosting, Functions, Firestore rules/indexes, and Storage rules.
- Hosting site is locked to `urai-staging`.
- Deploy script refuses production approval mode and explicitly deploys only the staging project/site.

### API and functions

HTTP endpoints:

- `GET /api/healthz`
- `GET /api/buildinfo`
- `POST /api/companion`
- `POST /api/waitlist`

Callable endpoints:

- `healthCheck`
- `authenticatedHealthCheck`
- `adminHealthCheck`
- `recordStagingEvent`
- `getFeatureFlag`
- `setFeatureFlag`
- `createStagingJob`
- `getStagingCompletionMatrix`

### Security and privacy

Strengths:

- Firestore includes a default-deny catch-all.
- Storage includes a default-deny catch-all.
- Admin-only callable functions use the admin guard.
- Waitlist writes are server-side through the HTTP function, not client Firestore writes.
- Public staging shell has `noindex,nofollow`.
- Hosting has baseline security headers: `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`.

Risks / follow-up checks:

- HTTP Functions currently use permissive CORS (`Access-Control-Allow-Origin: *`). This is acceptable for smoke endpoints but should be reconsidered before production endpoints handle private data.
- `POST /api/companion` intentionally stores only a truncated message preview for smoke proof. Keep this limit; do not turn it into raw private conversation logging.
- `POST /api/waitlist` stores an email in staging. Treat staging data as non-production and avoid using real user emails in smoke tests.
- Runtime Firebase rules proof still requires emulator or CI output.

### UI/staging shell

Completed in this pass:

- Replaced the plain placeholder shell with a mobile-responsive URAI staging lock page.
- Added URAI orb, ground layer, companion smoke framing, reduced-motion support, and smoke endpoint navigation.
- Preserved noindex posture and static hosting compatibility.

Limitations:

- This repo still does not contain the full magical home view product app, live memory map UI, or complete chat UI. It exposes a staging shell and validates backend/API surfaces.

## Blocking Audit Items

These must pass in CI/local execution before final lock:

1. `npm --prefix functions ci`
2. `npm run check:deploy`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build`
6. `npm run test:unit`
7. `npm run test:e2e` or `npm run test:rules` in an environment with Java/Firebase emulators
8. `npm run deploy:staging`
9. `npm run smoke:staging`

## Result

Status: deployment-prepared branch created, docs added, staging shell integrated. Runtime command execution and Firebase deploy were not performed from this assistant environment because the sandbox could not clone GitHub and no Firebase credentials/runtime were available here.
