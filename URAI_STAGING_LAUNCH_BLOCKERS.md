# URAI Staging Launch Blockers

| Area | Status | Evidence | Risk level | Required closure | Priority |
|---|---|---|---|---|---|
| Firebase project targeting | Complete for source controls | `.firebaserc` maps only default and staging to `urai-staging`; deploy readiness rejects any other alias or project. | High if changed | Preserve executable project and alias enforcement. | P0 |
| Canonical staging path | Complete | `URAI_STAGING_CANONICAL_APP.md` names `LifeLoggerAI/urai-staging`. | Medium | Do not deploy from sibling repositories. | P0 |
| Cross-repository source and emulator verification | Complete only for the latest accepted exact head | Confined CI executes pinned Admin, Privacy, and Jobs source, security, build, test, and emulator suites with SHA-bound evidence. | High | Rerun and reinspect whenever this branch or a pinned SHA changes. | P0 |
| Protected deployment authority | Source implementation pending exact-head acceptance | `Staging Deploy Lock` separates checks-only verification from an environment-gated live job, uses immutable actions, re-proves unchanged remote `main`, and confines credentials under `RUNNER_TEMP`. | High | Obtain exact-head CI, artifact inspection, independent review, merge, and checks-only receipt before live mode. | P0 |
| Infrastructure mutation boundary | Complete for source controls | The lock requires Hosting site `urai-staging` to pre-exist and contains no site-creation command. | High | Inspect current-head workflow and lock artifacts; never create infrastructure during release. | P0 |
| Static staging URL | Partial until protected deploy | `firebase.json` includes Hosting and `public/index.html`; local build/readiness checks run on every exact head. | Medium | Deploy through protected authority and smoke `https://urai-staging.web.app`. | P0 |
| Functions build | Complete only for the latest accepted exact head | Exact-head CI and Production Verify must pass Functions install, typecheck, tests, and build. | High | Repeat on merged exact main in checks-only workflow. | P0 |
| Firestore privacy rules | Complete for accepted emulator evidence | Rules and denial paths must pass retained Privacy and Staging emulator suites. | High | Prove protected apply, read-back, denial, and tenant isolation. | P0 |
| Live smoke | Not executed for the current candidate | `scripts/smoke-staging.sh` checks public, health, buildinfo, companion, invalid companion, and waitlist surfaces. | High | Run automatically after the protected deploy and inspect receipt. | P0 |
| Production overwrite protection | Complete for source controls | No production alias or selector exists; the protected lock targets only `urai-staging` and rejects production approval. | High if bypassed | Deploy only through `Staging Deploy Lock` from exact `main`; no direct commands. | P0 |
| Credentials | Not proven operational | Source confines the staging credential to `RUNNER_TEMP` and removes it after use. Secret and environment availability are not proven by repository inspection. | High | Verify the `staging` environment, required approval settings, and staging-only secret before live mode. | P0 |
| Monitoring | Missing | Repository checks do not prove external uptime monitoring. | Medium | Link Firebase logs and uptime evidence after protected deploy. | P1 |
| Recovery and rollback | Missing | Source/emulator verification does not prove cloud recovery or rollback. | High | Capture pre-deploy state, rollback target, tested recovery, and post-rollback smoke. | P0 |
| Full URAI product UI | Out of Scope | This repository owns the backend validation shell, not the production Spatial UI. | Medium | Verify the owning UI repository separately. | P1 |
| External systems | Partial | Admin, Privacy, and Jobs have a confined verification lane; other systems retain their own evidence gates. | Medium | Add protected deployment evidence per owning repository. | P1 |

## Current launch decision

Source, local-control, and confined cross-repository gates may be called green only for the unchanged exact head named by inspected CI artifacts and recorded PR/Drive receipts.

Protected Firebase staging deploy, live read-back, denial and tenant-isolation proof, secret/environment availability, monitoring, recovery, and rollback remain unproven. This repository must remain unmerged and must not be called live-verified until those receipts exist.