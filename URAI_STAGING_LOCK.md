# URAI Staging Lock

Status: Locked after Firebase deploy and live smoke.

- Firebase project: urai-staging
- Firebase Hosting site: urai-staging
- Staging URL: https://urai-staging.web.app
- Release candidate SHA: fa77f61 plus follow-up hardening commits
- Locked evidence captured at: 2026-05-21T00:59:00Z
- Canonical repo app path: LifeLoggerAI/urai-staging
- Deploy command: npm run ship:urai:staging
- Smoke command: npm run test:smoke:staging

## Required evidence captured

- Firestore emulator rules tests passed: 14 tests passed across 1 test file.
- Deploy readiness passed for project urai-staging and hosting site urai-staging.
- Firebase deploy completed successfully to urai-staging.
- Storage rules compiled successfully.
- Firestore rules compiled successfully.
- Functions TypeScript build completed.
- Functions source uploaded successfully.
- Hosting site urai-staging released successfully.
- Live Hosting fallback routes returned the URAI Staging shell.
- Live API rewrites returned JSON Function responses.
- Existing Firestore indexes were preserved by selecting No at the deletion prompt.
- Existing cloud functions not present in this local source were preserved by selecting No at the deletion prompt.
- The staging lock script wrote URAI_STAGING_LOCK.md and completed.

## Functions updated

- healthz
- buildinfo
- companion
- waitlist
- healthCheck
- authenticatedHealthCheck
- adminHealthCheck
- recordStagingEvent
- getFeatureFlag
- setFeatureFlag
- createStagingJob
- getStagingCompletionMatrix

## Functions preserved

The deploy prompt listed existing functions that are not present in this local source. They were preserved by selecting No at the deletion prompt.

- health
- onB2BLeadCreated
- onEventCreated
- onInsightCreated
- onMemoryCreated
- onNarrativeCreated
- onSignalCreated
- submitSignal
- replay

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

- Pull latest main before the next deploy so firestore.indexes.json includes the preserved URAI product indexes committed in a4a73fd6d6598eb4a855c949f73bf9f730110ac0.
- Upgrade Firebase Functions runtime and SDK before Node.js 20 decommissioning.
- Coordinate Core Web product staging lock in LifeLoggerAI/UrAi issue #286 before declaring full cross-repo URAI staging locked.
