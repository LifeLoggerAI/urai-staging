# URAI Staging Lock

Status: Locked after Firebase deploy and live smoke.

- Firebase project: urai-staging
- Firebase Hosting site: urai-staging
- Staging URL: https://urai-staging.web.app
- Release candidate SHA: 844c982
- Deployed at: 2026-05-17T19:16:00Z
- Canonical repo app path: LifeLoggerAI/urai-staging
- Deploy command: npm run deploy:staging
- Smoke command: npm run smoke:staging

## Required evidence captured

- Firestore emulator tests: 14 passed
- Firebase deploy: hosting site urai-staging, functions, firestore rules, firestore indexes, storage rules
- Functions created: healthz, buildinfo, companion, waitlist
- Functions updated: healthCheck, authenticatedHealthCheck, adminHealthCheck, recordStagingEvent, getFeatureFlag, setFeatureFlag, createStagingJob, getStagingCompletionMatrix
- Existing cloud functions were preserved by selecting No on deletion prompt.
- Live smoke passed for: /, /u/adamclamp, /api/healthz, /api/buildinfo, /api/companion valid request, /api/companion invalid request guard, /api/waitlist

## Live smoke evidence

- GET https://urai-staging.web.app/ -> 200
- GET https://urai-staging.web.app/u/adamclamp -> 200
- GET https://urai-staging.web.app/api/healthz -> 200
- GET https://urai-staging.web.app/api/buildinfo -> 200
- POST https://urai-staging.web.app/api/companion -> 200
- POST https://urai-staging.web.app/api/companion -> 400
- POST https://urai-staging.web.app/api/waitlist -> 200
- URAI staging live smoke passed for https://urai-staging.web.app

## Classification

LIVE / DEPLOYED / LOCKED / SYSTEM-OF-SYSTEMS STAGING READY
