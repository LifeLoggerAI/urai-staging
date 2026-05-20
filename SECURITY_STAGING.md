# URAI Staging Security Posture

## Scope

This document applies to the Firebase staging backend and validation shell in `LifeLoggerAI/urai-staging`. It does not certify production readiness for sibling URAI product repos.

## Current Controls

- Staging Firebase project is isolated as `urai-staging`.
- Production alias is separate from staging in `.firebaserc`.
- Firebase Hosting serves a noindex staging shell.
- `public/robots.txt` disallows crawler indexing.
- Firestore rules use explicit staging collection matches and a default-deny fallback.
- Storage rules use explicit staging paths and a default-deny fallback.
- Admin-only callable flows rely on a `role=admin` custom claim.
- The deploy script targets staging explicitly and refuses production approval mode.
- The smoke script uses synthetic staging data.

## Data Handling Rules

- Do not use real private user content in staging smoke checks.
- Use synthetic emails for waitlist smoke verification.
- Companion smoke requests should contain synthetic text only.
- Treat staging Firestore data as disposable validation evidence.

## Remaining Security Hardening Before Production

- Restrict HTTP Function CORS before using these endpoints for private production flows.
- Add stricter Hosting security headers where product UI requirements allow it.
- Add App Check where client Firebase access becomes part of staging product testing.
- Add monitoring/alerting for staging function errors and unexpected write volume.
- Confirm Firebase IAM access is least-privilege for all deploy operators.

## Release Gate

Staging is not locked until install, readiness, build, tests, deploy, and live smoke evidence are captured in `URAI_STAGING_LOCK.md`.
