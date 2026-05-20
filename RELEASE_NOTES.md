# URAI Staging Release Notes

Release candidate branch: `release/urai-staging-v1-integration-audit`
Date: 2026-05-20

## Summary

This release candidate prepares `LifeLoggerAI/urai-staging` as a cleaner URAI staging validation surface. It keeps the repo scoped as the Firebase staging backend and validation shell while aligning the public shell with URAI V1 core concepts: home field, orb, ground layer, companion smoke endpoint, privacy posture, and deploy readiness.

## Changes Completed

### Staging shell

- Replaced the minimal placeholder `public/index.html` with a polished, responsive URAI staging shell.
- Added symbolic orb and ground visuals.
- Added smoke endpoint navigation.
- Added reduced-motion support.
- Preserved `noindex,nofollow` staging privacy posture.
- Preserved static hosting compatibility.

### Documentation

Added:

- `SYSTEM_AUDIT.md`
- `TEST_REPORT.md`
- `DEPLOYMENT.md`
- `RELEASE_NOTES.md`

These documents provide the staging system map, security and deploy audit, command matrix, smoke plan, known limitations, and final lock requirements.

## Existing Capabilities Preserved

- Firebase Hosting shell and rewrites.
- HTTP smoke endpoints for health, buildinfo, companion, and waitlist.
- Callable auth and admin health checks.
- Callable staging event, feature flag, job, and completion matrix functions.
- Firestore default-deny rules.
- Storage default-deny rules.
- Staging deploy lock script.
- Live smoke script.
- GitHub Actions CI for Functions checks and emulator-backed tests.

## Not Included

This release candidate does not add the full product frontend to `urai-staging`. The repo remains the staging backend and validation shell. Full Next.js or React magical home, live memory map, full chat UI, and production app flows remain owned by sibling URAI product repos.

## Verification Required Before Merge or Deploy

Run:

```bash
npm --prefix functions ci
npm run check:deploy
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
npm run deploy:staging
npm run smoke:staging
```

## Release Decision

Status: release candidate prepared; runtime lock evidence still required.

Reason: runtime command output, emulator proof, Firebase deploy output, and live smoke output must be produced by CI or a local environment with repo checkout and Firebase credentials.
