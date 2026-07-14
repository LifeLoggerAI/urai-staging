# URAI Staging Deployment Guide

Repository: `LifeLoggerAI/urai-staging`  
Firebase project: `urai-staging`  
Hosting site: `urai-staging`  
Canonical URL: `https://urai-staging.web.app`

## Authority

Staging deployment is permitted only through `.github/workflows/staging-deploy.yml` (`Staging Deploy Lock`) dispatched from protected `main`.

Direct local deployment is intentionally blocked. Do not run `firebase deploy`, `firebase use`, or `npm run deploy:staging` from a developer shell.

The workflow uses a noncredentialed exact-main verification job followed by an environment-gated credentialed deploy job.

The workflow requires:

- an exact full current-`main` SHA supplied as `expected_main_sha`;
- `confirm_staging_project` equal to `urai-staging`;
- an exact, clean checkout equal to unchanged remote `main`;
- successful readiness, lockfile, lint, typecheck, build, unit, rules, and end-to-end tests;
- immutable pinned GitHub Actions;
- a separate `staging` environment for the credentialed job;
- the `FIREBASE_SERVICE_ACCOUNT_URAI_STAGING` secret available only to that protected job;
- a pre-existing Firebase Hosting site named `urai-staging`;
- temporary credentials confined to `RUNNER_TEMP` and removed after use.

## Checks-only execution

First dispatch `Staging Deploy Lock` from `main` with:

- `expected_main_sha`: the exact current `main` SHA;
- `confirm_staging_project`: `urai-staging`;
- `run_live_deploy`: `false`.

This produces an immutable checks-only artifact and supplies no staging credentials.

## Protected live deployment

Live deployment is allowed only after the exact merged `main` SHA has accepted source, cross-repository, and independent review evidence.

Dispatch the same workflow from `main` with:

- the unchanged accepted `main` SHA;
- project confirmation `urai-staging`;
- `run_live_deploy`: `true`.

The workflow re-verifies current remote `main`, enters the protected `staging` environment, materializes a temporary staging credential, and executes the locked deploy script.

## Locked deploy behavior

`scripts/urai-staging-lock.sh`:

1. Requires the protected workflow marker and GitHub Actions runtime.
2. Requires `refs/heads/main`, an exact 40-character candidate SHA, and equality with checkout, workflow SHA, and current remote `main`.
3. Requires a clean source tree before and after verification.
4. Requires the canonical staging project and URL and rejects production approval.
5. Requires a credential file confined under `RUNNER_TEMP`.
6. Verifies that Hosting site `urai-staging` already exists; it never creates infrastructure.
7. Runs deploy readiness, lint, typecheck, build, unit tests, rules tests, and end-to-end emulator tests.
8. Deploys Hosting, Functions, Firestore rules/indexes, and Storage only to `urai-staging`.
9. Runs strict live smoke tests.
10. Writes `URAI_STAGING_LOCK.md` containing exact SHA and workflow-run identity.

## Required retained evidence

- checks-only authority artifact;
- protected deploy artifact;
- `URAI_STAGING_LOCK.md`;
- exact workflow run and artifact digests;
- post-deploy endpoint and build-identity smoke results;
- denial and tenant-isolation evidence;
- monitoring, recovery, and rollback receipts.

A successful source or emulator run alone does not make staging live-verified.