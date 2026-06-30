# URAI Staging Production Lock Audit

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging
Default branch: main
Audit operator: ChatGPT connector pass

## Verdict

Status: PARTIAL / NOT READY for final staging lock.

This repository is a real Firebase staging backend and validation shell, not the production URAI product app. It has strong staging separation, deployment guardrails, CI commands, security rules, Cloud Functions, and a public staging Hosting shell. It is not a complete production app and should not be represented as production readiness for the whole URAI system.

## What this repo actually is

Classification: staging deployment/validation surface.

It owns:
- Firebase Hosting shell at public/index.html.
- Firebase Hosting rewrites for smoke API routes.
- Cloud Functions HTTP smoke endpoints and callable admin/auth checks.
- Firestore rules, indexes, and Storage rules for staging collections.
- CI, readiness scripts, deploy lock script, and smoke script.
- Documentation and release-readiness evidence for the staging environment.

It does not own:
- The full production URAI UI.
- Production deployment.
- Product browser E2E tests for sibling repos.
- Real public production launch claims.

## Access and branch evidence

- Repository access confirmed through GitHub connector.
- Permissions returned: admin, maintain, pull, push, triage.
- Repository visibility: public.
- Archived: false.
- Default branch: main.
- Recent searched commit before this pass: 545c48855f05325a16f28721058fec3b1672a03a, message `Add URAI XR release train staging gate`, dated 2026-06-02.
- Safe fix commit created during this pass: bcc43d9b0650ad7c3f6d67242b15d7b5aae4dae6.

## Safe fix completed

Fixed `.env.example` because it still referenced the deprecated staging project `urai-staging-35414255`. The file now aligns with the canonical staging project `urai-staging` and URL `https://urai-staging.web.app`.

## Proof files in this folder

- `environment-map.md`: staging/production boundary and route/API map.
- `build-test-deploy-proof.md`: commands, inspection evidence, and what could not be executed here.
- `blockers.md`: P0/P1/P2/P3 blockers and completion plan.

## Important limitation

The assistant runtime could inspect and update the GitHub repo, but could not resolve `urai-staging.web.app` from the execution container and does not have Firebase deploy credentials. Therefore live deploy and live smoke are not certified by this pass. The repo contains scripts to perform those checks, but the actual output must be generated from a Firebase-authenticated environment.

FINAL STATUS FOR THIS PROOF PASS: PARTIAL - staging repo is structured and guarded, but final lock requires real command, deploy, and smoke evidence.
