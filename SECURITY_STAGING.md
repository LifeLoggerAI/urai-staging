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
- Public write-capable HTTP functions require an exact protected `URAI_STAGING_WRITE_KEY`; CORS is defense-in-depth, not caller authentication.
- Valid authorized write requests are bounded by Firestore-backed per-endpoint daily budgets in addition to per-instance fixed-window caps.
- Synthetic waitlist records carry a seven-day expiry and a scheduled cleanup function removes expired waitlist/budget records.

## Data Handling Rules

- Do not use real private user content in staging smoke checks.
- Use synthetic emails for waitlist smoke verification.
- Companion smoke requests should contain synthetic text only.
- Treat staging Firestore data as disposable validation evidence.

## Remaining Security Hardening Before Production

- Provision the protected `URAI_STAGING_WRITE_KEY` in Firebase Secret Manager before enabling the write endpoints in a deployed staging revision; do not copy it into source, artifacts, or public verification jobs.
- Add stricter Hosting security headers where product UI requirements allow it.
- Add App Check where client Firebase access becomes part of staging product testing.
- Add provider-native monitoring/alerting for staging function errors, daily budget exhaustion, and unexpected write volume; source now exposes bounded counters but provider-side alert policy evidence is still required.
- Confirm Firebase IAM access is least-privilege for all deploy operators.

## Release Gate

Staging is not locked until install, readiness, build, tests, deploy, and live smoke evidence are captured in `URAI_STAGING_LOCK.md`.
