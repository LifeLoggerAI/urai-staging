# R886 — Legacy release command isolation, original native refusal tests, historical conflict and rollback risk

Observation: 2026-11-07 CST / 2026-11-08 UTC. **No deploy, no networked runner, no production authorization, no paid compute.**

## Actual original executable behavior, not just audit prose

Read the present default branch heads:
- `LifeLoggerAI/UrAi`: `8cac3ba513830c11261d57bc2b5dd7ad8b83e85a`.
- `LifeLoggerAI/UrAi-Dev`: `08257158e2ffee8bbeb183ae89185f1677bad1da`.
- `LifeLoggerAI/UrAiProd`: `d3d7ce6e607a5ee1be2c9f9ede6eecf1cfb393b9`.
- Canonical `LifeLoggerAI/urai-spatial` main `da94837c2457b0a7590e26a7a644cd728de8afb8`.

Downloaded exact original GitHub file contents for three actual deploy entrypoints, constructed files locally, used `git hash-object` and verified **byte-for-byte original Git blob SHA** before running them with locally installed Node 22.16.0/bash in an environment without Firebase secrets or cloud access.

| Repository | Exact source entrypoint | Git object SHA-1 | Original source SHA-256 (from retrieved bytes) | Observed invocation |
|---|---|---|---|---|
| `UrAi` | `scripts/deploy-urai-firebase.sh` | `ecca01a1939a740a0db2ac16a5737d1417e26ba0` | `c71540943c31b5def3f5cadc1accdf7fd8c90286e2ddc70e3161c843b185241c` | Exit 1: **Legacy deployment is disabled in this repository** |
| `UrAi-Dev` | `scripts/refuse-legacy-staging-deploy.mjs` | `05d95ae05a250e17ebafaea92b8162c3567f95b3` | `a45f2bd3d2ac62c19dcfb6628d157e920bf46f5e9ad4599fe8840f00d2b4d92d` | Exit 1: **Legacy reference; no staging or production authority** |
| `UrAiProd` | `scripts/deny-production-deploy.mjs` | `361aa72dc678d770b65c63ec609b8accfc93ba07` | `cbaeac993b8a8102668b97700b251a7b25af72907c1e0a521ed4caa4b0613093` | Exit 1: **Production deployment denied; Spatial is sole authority** |

All 3 verified expected refusal output and return code 1. Original machine-readable results: [R886_LEGACY_REFUSAL_NATIVE_RECEIPTS.json](R886_LEGACY_REFUSAL_NATIVE_RECEIPTS.json). Locally generated original-text verification receipt at `/mnt/data/staging-r886-legacy-check/receipt.json` in audit working container.

### Important coverage limit

This proves **three exact reviewed entrypoint scripts** refuse at their current pinned default branches. It does **not** prove that all historical scripts/manual CLI aliases/other credentials are inaccessible, that previously deployed Hosting bytes were removed, or that current Staging/Spatial production builds passed. Historical documents may still instruct direct Firebase CLI invocation; do **not** run any of them.

## Conflict: old instruction routes versus current actual release authority

Historical `LifeLoggerAI/UrAi/docs/FINAL_LAUNCH_CHECKLIST.md` at Git blob `8097ed103fa46b9be2e9be9df49b44aa2df476f6` instructs a `firebase-tools deploy --project urai-staging --only hosting --config firebase.staging.json` candidate but **it reports the earlier deploy failed due to missing CLI authentication**; that is *historical intended action only*. Current `firebase.staging.json` Git blob `6c83f4b4424cd067837eb3b5b2dcdd95bbb684c5` declares just local Firestore emulator, **no Hosting**. Current `UrAi` `package.json` Git blob `e20dc0995d3dbd00d27c57960e33cfc3ac486eec` retains `ship:urai:staging` wiring to `scripts/deploy-urai-firebase.sh`, which **now always exits 1** at Git blob `ecca01a1939a740a0db2ac16a5737d1417e26ba0`. Therefore do not treat old checklist or package script name as an available deployment command. `UrAi` `docs/LEGACY_PRODUCTION_DEPLOY_DISABLED.md` Git blob `326075f4ece8628bda12b770538c41830ec251de` explicitly assigns canonical production to `urai-spatial`.

`UrAi-Dev/apps/urai-staging/package.json` Git blob `c35e21819a8b486b53d7764bd5668054a8e4566b` directly invokes the verified refusal handler. The root `UrAi-Dev` quarantine document Git blob `95aa687d92d82f743cefaf364d7a68c456dfe138` forbids provider mutation. `UrAiProd/package.json` Git blob `7f634fad6257b88a278cfb6ff0261271d723c7d3` has root deploy methods delegating to the verified `scripts/deny-production-deploy.mjs`. `UrAiProd/docs/DEPLOYMENT_MATRIX.md` Git blob `45beb82b59755e1c372a30765541a0f7c75fd9b7` defines legacy collision risks, not a release grant.

**Additional stale rollback risk:** Old `UrAi/docs/STAGING_ROLLBACK_PLAN.md` Git blob `8e875d3c97dfd5744967d0d587796666f02aefa4` suggests `firebase hosting:clone <urai-staging-site>:live <urai-staging-site>:live --project urai-staging`: **same channel to itself**, with no specified historical version and no real proven rollback receipt. This must **not** be used as a recovery command or counted as an exercised rollback. Governed Staging rollback requires a distinct, previously observed and recoverable source/version plus separately authorized procedure.

The current canonical Staging root package `deploy:staging → lock:staging → scripts/urai-staging-lock.sh` is distinct; exact main `bda659ad23590b39e7f32de349f8a3723455ce02`, `scripts/urai-staging-lock.sh` Git blob `bf20e1b020668fb9eea6f8c28b76ab141c8da2d2` requires unchanged main, verified prebuilt, different ancestor rollback SHA, WIF ephemeral GitHub Actions credentials, explicit staging confirmation, existing site, and production-disabled flag **before cloud deployment**. This source was **read** but not executed because no protected environment credentials/authority were provided.

## R885 deployment fingerprint still decisive

The public `urai-staging.web.app` gives project identity `urai-staging`, but its Home error copy and robots output match older `UrAi` original source, while canonical Staging `public/index.html` and `public/robots.txt` differ. Both `/api/healthz` and `/api/buildinfo` returned 404. The three verified current legacy refusals do **not** identify which earlier deploy/release produced these responses; provider-side authenticated **read-only Hosting live release/version** remains required.

## Current environment limits and next original tests

Managed container has Node 22.16.0, npm 10.9.2, Java 21.0.12.1, Git 2.47.3. DNS for `github.com` is unavailable and full frozen R840 source/npm dependency checkout is absent; cannot run complete original R840 `npm ci`, full 23/23 callable Auth/Firestore/Storage acceptance or separate four-emulator tests here. The native tests performed in this continuation are only the three legacy refusal entrypoints above. The historic original October/November ZIP digests remain separately verified in [R884](11_R884_HISTORICAL_ARTIFACTS_LIVE_PARITY_AND_BRANCH_TREES.md); do not transfer historical tests to R840.

**Action gates:** owner-authorized read-only Firebase Hosting release readback; GitHub account-runner support #4889576 without payment changes; source-pinned native R840 full build, 23/23 real callable tests, distinct full four emulators, reviewer and branch required checks; approved staging deployment with actual source/version and rollback receipt; real Privacy→Jobs→Studio→Replay owner/revocation/deletion; independent physical-device/production certification. No production deploy or paid compute authorized.

**Final:** R886 legacy entrypoint refusal tests **3/3 PASS**, canonical Staging release admission **HOLD**, exact live deployment producer **UNKNOWN**, GitHub CI **BLOCKED**, production and physical devices **NOT CERTIFIED**.
