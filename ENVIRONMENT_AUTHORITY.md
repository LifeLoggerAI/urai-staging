# URAI Staging Environment Authority

Date: 2026-07-11

Repository: `LifeLoggerAI/urai-staging`

## Authority boundary

This repository owns only the URAI staging Firebase validation environment in source control.

- Controlled Firebase project identifier: `urai-staging`
- Firebase aliases in this repository: `default`, `staging`
- Expected Hosting URL: `https://urai-staging.web.app`
- Production alias: intentionally absent
- Production public product authority: `LifeLoggerAI/urai-spatial`
- Production Firebase target referenced by the spatial release contract: `urai-4dc1d`

This repository must not deploy to, alias, or imply ownership of the production project.

Source control authority does not by itself prove provider-account access, current billing good standing, credential validity, environment approval, existing infrastructure, deployment, or live health. Those require current provider and workflow receipts.

## Current status

`SOURCE AUTHORITY REPAIRED — NOT VERIFIED OR DEPLOYED`

Repository source contains staging Hosting, Functions, Firestore and Storage rules, indexes, tests, a staging lock script, smoke scripts and manual deployment workflow. A prior exact-head general CI run passed, but the required production-verification workflow failed because it did not install the functions workspace. The current repair makes verification exact-head and staging-specific.

No live deployment is authorized until every exact-head required workflow passes and the protected `staging` GitHub environment supplies a credential for exactly `urai-staging`.

## Environment rules

1. Staging data must be synthetic and isolated from production.
2. No production secret, service-account document, raw incident export or private user data may be committed.
3. Every deployment must assert the selected project is exactly `urai-staging`.
4. Every deployment must use a clean exact 40-character source SHA and a distinct approved ancestor rollback SHA.
5. The canonical deploy path must not create Hosting sites or other infrastructure.
6. Production service URLs may be referenced only as external dependencies and must never become Firebase aliases in this repository.
7. The public staging shell must remain visibly marked as non-production and blocked from indexing.
8. Authenticated/admin smoke must verify both allowed and denied access paths.
9. Emulator-backed rules/e2e tests are mandatory; a missing `nix-shell` is not a valid reason to skip them when Java is available.
10. A route returning HTTP 200 is not a staging certification receipt.
11. Billing good standing, provider-account access and environment-scoped credentials must be verified before live deployment.

## Required receipt fields

A current staging receipt must contain:

- repository and branch;
- exact tested SHA;
- exact deployed SHA;
- approved rollback SHA and separate provider evidence for the prior deployable revision;
- Firebase project and Hosting URL;
- protected GitHub environment, workflow run and artifact;
- credential project-ID validation without exposing the credential;
- install, readiness, lockfile, lint, typecheck, build, unit and emulator-backed rules/e2e results;
- confirmation that required Hosting and provider infrastructure existed before deployment;
- deployed Functions/Hosting/rules/indexes list;
- public, authenticated and admin smoke results;
- robots/no-index proof;
- synthetic-data confirmation;
- billing and provider-access confirmation;
- remaining blockers.

## Known documentation drift

The current README contains a historical statement that aliases for `default`, `staging`, and `production` are implemented. The actual `.firebaserc` contains only `default` and `staging`. This file and `.firebaserc` are authoritative until the README wording is corrected in the same release branch.
