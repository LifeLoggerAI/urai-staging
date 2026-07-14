# URAI Staging Launch Blockers

| Area | Status | Evidence | Risk level | Recommended fix | Priority |
|---|---|---|---|---|---|
| Firebase project targeting | Complete for source controls | `.firebaserc` maps default and staging to `urai-staging`; deploy readiness rejects any other alias or project. | High if changed | Keep the staging identity enforced by `scripts/check-deploy-readiness.mjs` and the locked deploy script. | P0 |
| Canonical staging path | Complete | `URAI_STAGING_CANONICAL_APP.md` names `LifeLoggerAI/urai-staging`. | Medium | Do not deploy staging from sibling app paths unless the authority decision changes through review. | P0 |
| Cross-repository source and emulator verification | Complete for pinned candidates | Exact-head CI run `29348795243` executed the confined Admin, Privacy, and Jobs verifier with zero failed steps and retained SHA-bound evidence. | High | Preserve the candidate manifest and rerun the verifier whenever any pinned SHA changes. | P0 |
| Static staging URL | Partial until protected deploy | `firebase.json` includes Hosting and `public/index.html`; local build and readiness checks pass. | Medium | Run the authorized locked staging deploy, then smoke `https://urai-staging.web.app`. | P0 |
| Functions build | Complete for source validation | Exact-head CI and Production Verify passed Functions install, typecheck, tests, and build. | High | Repeat from protected merged authority before cloud activation. | P0 |
| Firestore privacy rules | Complete for emulator validation | Rules and denial paths passed the retained Privacy and Staging emulator suites. | High | Prove protected staging apply, read-back, denial, and tenant isolation separately. | P0 |
| Live smoke | Not executed on this candidate | `scripts/smoke-staging.sh` checks `/`, `/u/adamclamp`, health, buildinfo, companion, invalid companion, and waitlist. | High | Run only after the authorized deploy to `urai-staging`. | P0 |
| Production overwrite protection | Complete for repository controls | The staging repo defines no production alias or production project selector; the lock script targets only `urai-staging`. | High if bypassed | Use only `npm run deploy:staging`; never use an ad hoc raw deploy path. | P0 |
| Environment variables | Partial | `.env.example` lists staging and provider variable names without secret values and exposes no production project selector. | Medium | Supply protected staging credentials only through the authorized environment. | P1 |
| Monitoring | Missing | No accepted monitoring or uptime receipt exists for the current candidate. | Medium | Add Firebase logs and uptime evidence after the protected deploy. | P1 |
| Recovery and rollback | Missing | Source and emulator verification do not prove cloud recovery or rollback. | High | Capture the pre-deploy staging state, immutable deploy receipt, rollback target, and tested recovery result. | P0 |
| Full URAI product UI | Out of Scope | This repository owns the backend validation shell, not the production Spatial UI. | Medium | Verify the owning UI repository separately. | P1 |
| External systems | Partial | Admin, Privacy, and Jobs pinned candidates passed confined verification; other systems retain their own evidence gates. | Medium | Add protected deploy evidence per owning repository. | P1 |

## Current launch decision

The source, local-control, and confined cross-repository emulator gates are green for exact Staging head `29b7dd7540a2819f119da19ae5f2165f244c9c93`.

Actual protected Firebase staging deploy, live read-back, denial and tenant-isolation proof, monitoring, recovery, and rollback are not executed. This repository must remain unmerged and must not be called live-verified until those authorized receipts exist.