# URAI Staging Launch Blockers

| Area | Status | Evidence | Risk level | Recommended fix | Priority |
|---|---|---|---|---|---|
| Firebase project targeting | Complete | `.firebaserc` maps default and staging to `urai-staging-35414255`; lock script refuses non-staging project. | High if changed | Keep project ID hardcoded in staging deploy script. | P0 |
| Canonical staging path | Complete | `URAI_STAGING_CANONICAL_APP.md` names `LifeLoggerAI/urai-staging`. | Medium | Do not deploy staging from sibling app paths unless this doc changes. | P0 |
| Static staging URL | Partial until deployed | `firebase.json` now includes Hosting and `public/index.html`. | Medium | Run `npm run deploy:staging` and smoke `/`. | P0 |
| Functions build | Partial until local run | Existing TypeScript build path plus HTTP smoke endpoints. | High | Run `npm run build`. | P0 |
| Firestore privacy rules | Partial until emulator/live deploy | Rules default-deny unknown documents and restrict staging collections. | High | Run `npm run test:e2e` and deploy rules. | P0 |
| Live smoke | Partial until Adam runs with credentials | `scripts/smoke-staging.sh` checks `/`, `/u/adamclamp`, health, buildinfo, companion, invalid companion, waitlist. | High | Run `npm run smoke:staging` after deploy. | P0 |
| Production overwrite protection | Complete for repo script | Lock script only deploys `--project urai-staging-35414255` and refuses prod approval flag. | High if bypassed | Use only `npm run deploy:staging`; do not call raw deploy commands for staging. | P0 |
| Environment variables | Partial | `.env.example` lists required variable names only. | Medium | Fill local/CI secrets outside repo. | P1 |
| Monitoring | Missing | No monitoring URL in repo. | Medium | Add Firebase logs/uptime check link after first deploy. | P1 |
| Full URAI product UI | Out of Scope | This repo owns backend validation shell, not full UI. | Medium | Verify the owning UI repo separately. | P1 |
| External systems | Unknown/Out of Scope | System matrix marks external modules needing their own evidence. | Medium | Add deploy evidence per owning repo. | P1 |

## Current launch decision

This repo is ready for Adam to run the locked staging deploy. It is not live-verified until the deploy and smoke commands pass from a Firebase-authenticated terminal.
