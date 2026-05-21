# URAI Staging Lock

Status: Locked after Firebase deploy and live smoke.

- Firebase project: urai-staging
- Firebase Hosting site: urai-staging
- Staging URL: https://urai-staging.web.app
- Release candidate SHA: fa77f61 plus smoke-script hardening commit 2c2c43af3dfcbf894c32b1d002aad8e734795dca
- Locked evidence captured at: 2026-05-21T00:00:00Z
- Canonical repo app path: LifeLoggerAI/urai-staging
- Deploy command: npm run ship:urai:staging
- Smoke command: npm run test:smoke:staging

## Required evidence captured

- Deploy readiness passed for project urai-staging and hosting site urai-staging.
- Firebase deploy ran after reauthentication.
- Storage rules compiled successfully.
- Firestore rules compiled successfully.
- Functions TypeScript build completed.
- Functions deploy packaging completed.
- Live Hosting fallback routes returned the URAI Staging shell.
- Live API rewrites returned JSON Function responses rather than the B2B Portal HTML shell.
- Existing Firestore indexes were preserved by selecting No at the deletion prompt.

## Live smoke evidence

- GET https://urai-staging.web.app/ -> 200
- GET https://urai-staging.web.app/u/adamclamp -> 200
- GET https://urai-staging.web.app/robots.txt -> 200
- GET https://urai-staging.web.app/api/healthz -> 200
- GET https://urai-staging.web.app/api/buildinfo -> 200
- POST https://urai-staging.web.app/api/companion valid request -> 200
- POST https://urai-staging.web.app/api/companion empty message guard -> 400
- POST https://urai-staging.web.app/api/waitlist synthetic email -> 200
- URAI staging live smoke passed for https://urai-staging.web.app

## Live API response proof

- /api/healthz returned status ok, service urai-staging, projectId urai-staging, and hostingUrl https://urai-staging.web.app.
- /api/buildinfo returned status ok, service urai-staging, projectId urai-staging, hostingUrl https://urai-staging.web.app, releaseCandidateSha unknown, deployedAt unknown, and nodeEnv production.
- /api/companion valid request returned status ok and service urai-staging-companion.
- /api/companion empty message returned status error with error code message_required.
- /api/waitlist returned status ok, service urai-staging-waitlist, and stored true.

## Known deploy warnings captured

- Firebase Functions runtime Node.js 20 was deprecated on 2026-04-30 and is scheduled for decommissioning on 2026-10-30.
- firebase-functions SDK 4.9.0 is outdated.
- Firebase CLI recommended upgrading firebase-functions to a newer major version with breaking-change review.

## Classification

LIVE / DEPLOYED / LOCKED / STAGING BACKEND READY

## Remaining follow-up

- Upgrade Firebase Functions runtime and SDK before Node.js 20 decommissioning.
- Coordinate Core Web product staging lock in LifeLoggerAI/UrAi issue #286 before declaring full cross-repo URAI staging locked.
