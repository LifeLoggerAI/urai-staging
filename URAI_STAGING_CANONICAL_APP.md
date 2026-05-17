# URAI Staging Canonical App Decision

Status: Active decision for this repository.

## Decision

The canonical staging app path for this repository is:

```text
LifeLoggerAI/urai-staging
```

This repository owns the URAI staging backend and validation surface:

- Firebase Hosting staging shell
- Cloud Functions
- Firestore rules
- Firestore indexes
- Emulator-backed rules tests
- Staging deploy lock script
- Live smoke tests
- Staging readiness, blocker, and definition-of-done documents

## Relationship to other URAI app paths

`apps/web` and `apps/urai-staging` may exist in other URAI repositories, but they are not the canonical deploy path for this repository. This repo is intentionally backend-first and serves a minimal Firebase Hosting shell only so staging has a live, smoke-testable URL.

## Firebase project binding

- Staging project: `urai-staging-35414255`
- Staging URL: `https://urai-staging-35414255.web.app`
- Production project reference: `urai-4dc1d`

The staging lock script must deploy only to `urai-staging-35414255`. Production deployment is explicitly out of scope for this repo script.

## Deployment command

```bash
npm run deploy:staging
```

This command delegates to `scripts/urai-staging-lock.sh`, which performs readiness checks, build checks, tests, Firebase deploy, and live smoke tests.
