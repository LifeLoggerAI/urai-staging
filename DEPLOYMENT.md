# URAI Staging Deployment Guide

Repository: LifeLoggerAI/urai-staging
Firebase project alias: `urai-staging`
Hosting site: `urai-staging`
Canonical staging URL: `https://urai-staging.web.app`

## Purpose

This repository deploys the URAI staging backend and validation shell. It is intentionally scoped to staging Firebase infrastructure: Hosting, Cloud Functions, Firestore rules/indexes, Storage rules, and live smoke endpoints.

## Prerequisites

- Node.js 20
- npm
- Firebase CLI authenticated with access to `urai-staging`
- Java/Firebase emulator support for rules tests
- In Firebase Studio/IDX, use `.idx/dev.nix` for Java instead of installing Java with apt.

## Safe Deploy Path

```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
git checkout release/urai-staging-v1-integration-audit
npm --prefix functions ci
npm run check:deploy
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
firebase use urai-staging
npm run deploy:staging
```

## What `npm run deploy:staging` Does

The deploy command delegates to `scripts/urai-staging-lock.sh`, which:

1. Refuses to run if the staging project override is not `urai-staging`.
2. Refuses to run if a production approval flag is enabled.
3. Selects Firebase project `urai-staging`.
4. Confirms or creates Hosting site `urai-staging`.
5. Installs Functions dependencies.
6. Runs deploy-readiness checks.
7. Runs lint, typecheck, build, and unit tests.
8. Runs emulator-backed E2E tests when `nix-shell` is available.
9. Deploys Hosting, Functions, Firestore rules, Firestore indexes, and Storage rules.
10. Runs live smoke checks.
11. Writes `URAI_STAGING_LOCK.md` on success.

## Manual Smoke After Deploy

```bash
URAI_STAGING_PROJECT_ID=urai-staging \
URAI_STAGING_URL=https://urai-staging.web.app \
npm run smoke:staging
```

## Direct Endpoint Checks

```bash
curl -i https://urai-staging.web.app/
curl -i https://urai-staging.web.app/api/healthz
curl -i https://urai-staging.web.app/api/buildinfo
curl -i -X POST https://urai-staging.web.app/api/companion \
  -H 'Content-Type: application/json' \
  -d '{"message":"Staging smoke check","source":"manual"}'
curl -i -X POST https://urai-staging.web.app/api/waitlist \
  -H 'Content-Type: application/json' \
  -d '{"email":"launch-smoke@example.com","source":"manual-smoke"}'
```

## Production Safety

Do not deploy this repo to production. Production remains bound to a separate Firebase alias and is intentionally not targeted by `scripts/urai-staging-lock.sh`.

## Evidence to Commit After Successful Deploy

- `URAI_STAGING_LOCK.md`
- Relevant CI/deploy logs copied into release notes or attached to the PR
- Updated `TEST_REPORT.md` with actual command output summaries
