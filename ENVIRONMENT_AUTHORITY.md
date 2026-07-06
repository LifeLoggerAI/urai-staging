# URAI Staging Environment Authority

Date: 2026-07-06

Repository: `LifeLoggerAI/urai-staging`

## Authority boundary

This repository owns only the URAI staging Firebase validation environment.

- Firebase project: `urai-staging`
- Firebase aliases in this repository: `default`, `staging`
- Expected Hosting URL: `https://urai-staging.web.app`
- Production alias: intentionally absent
- Production public product authority: `LifeLoggerAI/urai-spatial`
- Production Firebase target referenced by the spatial release contract: `urai-4dc1d`

This repository must not deploy to, alias, or imply ownership of the production project.

## Current status

`IMPLEMENTED BUT NOT DEPLOYED/RECEIPTED FOR CURRENT MAIN`

Repository source includes staging Hosting, Functions, Firestore and Storage rules, indexes, tests, a staging lock script, smoke scripts and manual deployment workflow. Current install/build/test/deploy/live-smoke receipts for main are still required.

## Environment rules

1. Staging data must be synthetic and isolated from production.
2. No production secret, service-account document, raw incident export or private user data may be committed.
3. Every deployment must assert the selected project is exactly `urai-staging`.
4. Production service URLs may be referenced only as external dependencies and must never become Firebase aliases in this repository.
5. The public staging shell must remain visibly marked as non-production and blocked from indexing.
6. Authenticated/admin smoke must verify both allowed and denied access paths.
7. A route returning HTTP 200 is not a staging certification receipt.

## Required receipt fields

A current staging receipt must contain:

- repository and branch;
- exact tested SHA;
- exact deployed SHA;
- previous rollback SHA;
- Firebase project and Hosting URL;
- workflow run and artifact;
- install, lint, typecheck, build, unit and Firestore-rules results;
- deployed Functions/Hosting/rules/indexes list;
- public, authenticated and admin smoke results;
- robots/no-index proof;
- synthetic-data confirmation;
- remaining blockers.

## Known documentation drift

The current README contains a historical statement that aliases for `default`, `staging`, and `production` are implemented. The actual `.firebaserc` contains only `default` and `staging`. This file and `.firebaserc` are authoritative until the README wording is corrected in the same release branch.
