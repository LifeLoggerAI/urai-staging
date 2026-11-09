# ONE URAI GENESIS — R890 Complete current-candidate byte inventory, staging architecture, CI/release provenance and acceptance ledger

**Observed:** November 8, 2026 (Central) / November 9 UTC. **Disposition:** SOURCE INVENTORY VERIFIED FOR R887 ONLY; STAGING LIVE HOLD; PRODUCTION NO-GO; PHYSICAL DEVICE NOT CERTIFIED. **This is an audit, not a launch authorization.**

## Executive meaning

This repo is the Firebase **staging validation and release-control shell**, not the canonical consumer UrAi application and not the production consent/Jobs/Studio/Replay system. The software and safeguards exist in source, and previous workers produced genuine historical emulator/CI/browser receipts, but no currently verified live-deployed source identity, successful current R887 frozen test suite, authenticated cross-service private-media run, independent approved protected promotion, or device certificate exists. Earlier historical implementations remain built and retain provenance. Do not recreate, overwrite, or erase the current worker branches.

The prior [R889 handoff](16_R889_FRESH_STAGING_RELEASE_RECONCILIATION_20261108.md) documents the current CI/ref discrepancy. This R890 continuation **independently reads, hashes and size-verifies every Git-tracked file in the immutable R887 source tree**, closing the previously explicit current-release-candidate byte coverage gap. No new source test result, provider release, permissions, user media or deployment is claimed.

## 1 — Full exact current R887 source-byte census

**Pinned source:** Staging engineering #180, R887 `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` (unmerged draft; descendant of R840 #176 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b`).

- GitHub immutable recursive tree: 293 total tree entries, **247 Git-tracked blobs** and 46 tree entries; no truncation; **1,726,287 declared blob bytes**.
- R890 original Git Blob API readback: **247/247** blobs; **1,726,287/1,726,287 actual UTF-8 bytes**; **247/247 SHA-256 digests** computed with separately known `abc` SHA256 vector validation; **247/247 declared sizes matched**, no unreturned files or mismatched path/SHA identity in the index.
- 16 sequential source manifest segments in `docs/estate/manifests/R890_R887_BYTES_000_016.json` through `R890_R887_BYTES_240_247.json`. Every row contains source path, immutable Git blob SHA-1, Git-declared size, retrieved byte length, computed SHA-256 and state. The manifest index `docs/estate/manifests/R890_R887_COMPLETE_BYTE_COVERAGE_INDEX_20261108.json` enumerates all 16 paths, their Git blob identities, source SHA/tree, coverage proof and exclusions.
- This is **100% at that one pinned current Git tree**. **It is NOT 100% across all 182+ current branch heads, all historical commits, tags, deleted refs, archival artifacts, LFS content, cloud resources or user media.** Prior R884 already covers **180 earlier branch-head Git tree metadata** (28,540 repeated branch/path entries, 826 unique blobs, 299 unique paths, 201,390,308 repeatedly referenced metadata bytes; zero truncations) and SHA256 for only 11 R840 critical source files (418,238 bytes). The present R890 pass has a separate source identity and supersedes none of those historical manifests.
- No native binary extension was observed among this immutable candidate's tracked Git blob paths; this does not rule out binary artifacts in historical refs, CI artifacts, LFS, storage or published build outputs. Git SHA-1 blob identity is recorded separately from original-byte SHA-256.

| Source role | Commit SHA | Files / declared byte coverage | Practical meaning |
|---|---|---|---|
| Staging default `main` | `bda659ad23590b39e7f32de349f8a3723455ce02` | 147 / 1,054,519; tree metadata only | No advanced source merged and no live deploy identity |
| R840 converged source #176 | `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | 244 / 1,715,705; earlier 11-file SHA256 subset | Actual 23-check acceptance pending |
| R887 test enrollment #180 | `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | **247/247 original byte-hashed** (1,726,287 B) | Current most complete reviewed engineering candidate, NOT a completed build/deploy |
| R888 prior docs #181 | `689817d9f0f45e012a8174f5b40e115107b73a82` | 179 / 4,478,634 Git-tree bytes | Separate accumulated docs branch |
| R889 docs #182 | `cb59f1c006636537becb3e8aaee1901e19911ed1` | New source-audit handoff | Ancestor of this R890 docs branch, not engineering code |

**Coverage method caution:** Exact Git blob API content read + byte/size/hash computation proves the retrieved source-body bytes at this observed Git object. It does not prove JS/TypeScript semantic correctness, whether code has security vulnerabilities, that the bytes are compiled/deployed, or that any test passed. Do not label this `production_verified`.

## 2 — Current source architecture by ownership, actual function, and exposure

- **Hosting:** `.firebaserc` maps only `default` and `staging` to Firebase project `urai-staging`, no production alias. `firebase.json` declares site `urai-staging`, `public/` static staging shell, rewrite routes `/api/companion`, `/api/waitlist`, `/api/healthz`, `/api/buildinfo`, then HTML fallback. Source expects deny-all robots and `noindex,nofollow`. Separate original legacy UrAi UI is not the canonical staging shell.
- **Functions:** Firebase Functions `functions/`, Node 22, Firebase Admin/Functions, TypeScript compiled `functions/lib/`; guarded API, auth, feature flags, staging events/job facilities and synthetic lifecycle callable endpoints. The latter are explicitly **disposable-emulator-only**, not an authorization to serve true private memories.
- **Firestore / Storage Rules:** `firestore.rules`, `firestore.indexes.json`, `storage.rules` and Rules tests exist. The effective live deployed Rules may differ; source inspection does not determine privileged server/IAM behavior. Staging publishing both Rules sets can overlap with shared project owners—consult Labs Rules-collision #261 and independent Admin/RuAi/Spatial branches before any publish.
- **Emulators:** source `firebase.json` binds local Auth 9099, Functions 5001, Firestore 8080, Hosting 5000, Storage 9199; synthetic lifecycle uses `urai-staging-test` and fixed `127.0.0.1` host guards, never genuine project/user data. Real callable acceptance is three emulators (Auth+Firestore+Storage). R451 separately specifies four (adds Functions), and results are not interchangeable.
- **Synthetic lifecycle:** `functions/src/syntheticMemoryLifecycle.ts` (Git blob `4df1d9ca7c72910b2e24ef46c95019944abaf080`, 22,966 text characters) stores synthetic consent/memory/graph, uses callable auth, owner UID checks, consent/revocation/expiry gating, transactional creation and 128-node graph capacity, parent and ancestor checks before/after replay media reads, revoked/deleted descendant denial and failed-upload/cleanup safeguards. `functions/src/syntheticStorageResidue.ts` (blob `08726882b08d7929c770479425995d2dd95730c4`) validates owner object scopes and confirms no residual files. These behaviors are implementation assertions subject to actual source-current tests, not proof of production issuer or durable purge.
- **Communications staging consumers:** `config/staging-consumers.json` has two active protected, bounded synthetic-only modes (Twilio trial and signed SendGrid callback), Functions-only allowlists, production/hosting/shared Rules disabled, explicit rollback-to-sending-disabled and scoped ref verification. Historical Admin #57 and Spatial #1600 are not active consumers. **Actual provider IAM and sends are unverified**.

## 3 — Exact build, dependency, workflow and artifact custody

- **Versions:** R840/R887 root and Functions engines Node 22; `functions/package-lock.json` v3 blob `d04e6bc1daaf49a0a4dd8102c93caff37dbf0f76`, Functions package blob `94b1a58084bb79892a37290c1a53f181b2e1568b`. Manifest declarations match lockfile root for 2 prod and 6 dev packages. Selected exact locked versions: Firebase Tools 15.32.1, Firebase Admin 14.5.0, Firebase Functions 7.4.0, TypeScript 5.9.3, Vitest 4.1.11. No original current-head `npm ci` or build was run here.
- **Toolchain discrepancy:** governed staging deploy workflow explicitly sets Firebase CLI 15.23.0, versus 15.32.1 in R887 Functions lock. Confirm the actual installed deploy CLI receipt and feature/compatibility with target source. Historic `ENVIRONMENT.md` Node 20 prose is superseded by executable Node 22 control; retain historical text as provenance.
- **CI:** `.github/workflows/ci.yml` checks exact PR head, clean Git checkout, Node22/Java21, explicit readiness/consumer/security checks, bootstrap and evidence upload. Some Chromium/Workstream C/native cross-service jobs are branch/PR scoped and cannot be presumed to run for R887.
- **URAI Production Verify:** `.github/workflows/urai-production-verify.yml` is a staging SOURCE verification workflow; its name is not a production release receipt. R887 adds source wiring guard plus original capacity and callable lifecycle commands before evidence handling.
- **Deploy Lock:** `.github/workflows/staging-deploy.yml` permits manually controlled exact current `main`, distinct ancestor rollback SHA, project confirmation, `run_live_deploy=false` default, credential-free preflight, source-bound prebuilt seal, optional `environment: staging` cloud job, short-lived GitHub OIDC/WIF, explicit project and site checks, production-disabled flag, separate mutation receipt and negative smoke. Source `scripts/urai-staging-lock.sh` verifies `GITHUB_ACTIONS=true`, exact checked-out unchanged main SHA, clean source, rollback ancestry, staging-only project, no consumer mutation assignment, WIF credentials, no new Hosting site, explicit confirmation and approved locked prebuilt manifest. **Configured barriers do not prove live environment protection, IAM or a successful rollback drill**.
- **Prebuilt:** `scripts/staging-prebuilt-manifest.mjs` pins source SHA and source Git tree, source-controlled Firestore/Storage/config/lock bytes plus `functions/lib` and `public`, refuses changed tracked files and symlinks and compares materialized artifact bytes. This is a reproducibility design, not a generated current R887 build receipt.
- **Smoke:** `scripts/smoke-staging.sh` requires exact mutation receipt, matching project/source/release timestamp and workflow run, valid JSON health/buildinfo, deny-all robots, nonindexable page, and *negative* invalid requests/origin denial. Its current source is not an approval to create real records or send messages.
- **R887 source-order check:** independent connector-side exact-source assertions confirmed in **3/3 workflow files** each of these commands exists once, in order: `node --test scripts/test-r887-release-acceptance-wiring.mjs`; `npm run test:r816:capacity`; `npm --prefix functions run test:synthetic-lifecycle:http-emulator`. They precede Staging prebuilt seal and cloud credential acquisition. This source structure is necessary but not a native runtime test. New R887 Node script itself was NOT run in the R889/R890 checks.

## 4 — Historical tests, latest CI failure, transferable versus nontransferable proof

| Exact evidence | Result | Limit |
|---|---|---|
| Oct 17 hosted Staging `9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9`, CI 39058851765, cross-service 39058851767, Verify 39058851791 | Three hosted workflows success with actual steps; original ZIP artifacts hash-checked in R884 | Old SHA; not current R887, live deploy, real output or devices |
| Oct 17 original R451 four-emulator synthetic | Historical 40/40 with Auth/Firestore/Storage/Functions; 16 browser scenarios/13 interactions on isolated Spatial artifact | Not a new four-emulator R887 run or physical device |
| R793 #174 donor `f2d8130406fe5a65a5863efa2337eca5b8521121` | Historic 322/322 original suite, Storage SDK 5/5, callable HTTP 21/21; Drive donor archive all 15 listed file hashes verified in R884 | Donor SHA, 21 not 23, no production cross-service |
| R816 #175 `1e9b8c7f0044450c0a9f0750d33ab36d2324c851` | In-memory 3/3 capacity fence | Donor, no real Firebase |
| R840 #176 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | 23 actual three-emulator callable cases **expected** | No source-current 23/23 execution receipt |
| R887 #180 `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | 247/247 source blobs independently SHA256 read; 3/3 workflow structural checks | No frozen install, native tests, four emulators or cloud proof |
| GitHub Actions R840 CI 42335811356 / Verify 42335811359 | Failed without recorded test steps | Not a source-compiler failure finding |
| GitHub Actions R887 CI 42447439250 / Verify 42447439206 | Failed without recorded test steps | Not a source PASS or same-source test failure |
| GitHub Actions R888 docs CI 42448829669 / Verify 42448829714 | Failed without recorded test steps | Documentation source only; no release green |

Issue: exact cause of GitHub Actions zero-step startup/eligibility cannot be diagnosed from these run records alone. Owner support case #4889576 and account-side controls remain required; do not bypass independent review or claim CI succeeded. Do not dispatch paid compute or edit billing to manufacture status.

## 5 — Real environment/deployment parity and exposed unknowns

| Concern | Disposable emulators | Protected staging provider | Production |
|---|---|---|---|
| Project | `urai-staging-test` | `urai-staging` (configured, live release unknown) | Different canonical Spatial UI and private services |
| Data | Synthetic-only | Synthetic-only staging consumers configured; effective IAM/data boundaries unknown | Private real memories require signed consent/ownership/deletion |
| Hosting | Local shell, real emulator wiring | `urai-staging.web.app` historical public fingerprint **mismatched source** | `urai.app` production authority must be independently proven |
| User experience | Isolated historic static browser, not deployed | Historical public `/home` stalled, API health/buildinfo 404, robots permissive | Actual complete nine-state UI, AAA+++ visuals, real device evidence missing |
| Auth/server | Synthetic callable owner | WIF/IAM/Auth/Functions actual effective state unknown | Signed owner/tenant/org/Privacy-to-Jobs-to-Study-to-Replay not certified |
| Rules | Source + emulator Rules tests | Effective Firestore/Storage Rules and collision ownership unknown | Rules not automatically shared/certified |
| Build | R887 reproducibility source proven by byte hashes | No verified deployment SHA, artifact digest or rollback execution | No separately authorized release acceptance |

**Source-to-live mismatch is a dated observation:** R885 observed public `/__/firebase/init.json` project identity `urai-staging`, but `/home` failure wording and permissive robots matched legacy `LifeLoggerAI/UrAi` Git source, while `/api/healthz` and `/api/buildinfo` were 404 instead of canonical Staging JSON. The exact Hosting release version, deployer, Functions rewrite and rollback lineage are **UNKNOWN**. Do not overwrite the site to solve a hypothesis. Next **GET-only**, owner-authorized Firebase Hosting `sites/urai-staging/channels/live/releases` followed by referenced `sites/urai-staging/versions/{id}` receipt; compare source, headers, rewrites, releaseTime, releaseUser, active site/domain and published artifact hash. Additional owner Cloud Shell R286/R287 historic Nov 1 snapshot lists project `urai-staging` number 525778299248 and cloud resources, but is dated, not current live authorization or correct source-bound promotion. Cloud Scheduler and periodic orphan cleanup remain a separate design/approval gate.

**Protection:** GitHub main API was `protected:false`; read-only exposed repository rulesets were `[]`; branch-protection details are inaccessible to this GitHub App (403). Actual effective enterprise policy, environment approval, required checks and reviewer independence cannot be inferred from workflow YAML. Separate owner review is required.

## 6 — Important new exact-source authority conflict (do not silently 'fix' in docs)

Both active Communications synthetic consumers in Staging `config/staging-consumers.json` currently pin `759f664cdf00a48272f5401b7cfc45bbd8afb537` on `refs/heads/main`. Fresh Communications `main` was `40cd2f4b6d422734869486a49cddac9e103a58f1`, verified GitHub compare **22 ahead, 0 behind**. Staging `scripts/validate-staging-consumers.mjs` also hardcodes old exact SHA and `scripts/verify-private-consumer-refs.mjs` independently checks actual protected branch via approved API/SSH; `docs/estate/03_ARCHITECTURE_AND_CONNECTIONS.md` prematurely calls newer Communications SHA 'config source pin' though JSON is older. This is an **actual current source-authority mismatch**, not evidence of deployed mutation or an unauthorized message. Don't adjust only JSON or bypass protections. The responsible Communications+Staging owners must review intentional pin semantics, new upstream behavior, trial sender permissions and suppression semantics, then propose a **separate engineering patch** updating config + validator + original native negative tests + protected verification receipts together.

## 7 — Cross-repository release/deletion/data ownership dependencies

| System | Integration to admit before final Staging GO | Prior active review snapshot; must recheck |
|---|---|---|
| Spatial UI / canonical product | Life Map Focus Replay Escape; exact app source/build/site and safe live-release rollback; physical devices | Spatial #2073 `df19b28c9a75b5201d06ee859de89b3b3bebc967` |
| Privacy | Server-issued signed owner grant, cryptographic authority, revocation/deletion, cross-owner denied | Privacy #238 `351268923365bbc7ffe4eebb4469fbb02b7a6195` |
| Jobs | Tenant/org owner cancellation, quota, write-after-revocation privileged GCS boundary, source SHA | Jobs #368 `ebdf5f62338822f99b7293bdd5b9a0cda4917dd9` and #369 `e2f22162fe0ff03b4da3ba85cca4d466f31a704e`, divergent donor fixes |
| Studio | Authorized private MP4/SRT/output, service-owned worker audit, live membership and contract | Studio #197 `e974ce3254130e2fa5d1cf2d0fcebf13153e3261` |
| RuAi | Organization/clinician user separation, delegated consent, rule ownership | B2Bportal #78 `7f9f737ecd2fc5d7d3f7577e5b09c0f1fb7dcba5` |
| Admin | Privileged operations, deployed Rules/Functions source, audit logs and least privilege | Admin #113 `22197620054dbaa20a60944466bbdc7ae319527b` |
| Communications | Verified current exact SHA, trial/SendGrid controls, opt-out, no unauthorized production send | Communications #102 `5820a07bf0cccbef9cce6ee32e87a34e0b1a3330` |
| Shared Firebase publishing | No overlapping Rules or Functions namespace overwrite | Labs #261 `2980ca804fe04c37256a00af6e291a79a05004e4` |
| Legacy UrAi / UrAi-Dev / UrAiProd | Historical provenance only, currently refusal scripts; may explain old web content, **not deployment authority** | R886 source-matched original 3/3 deploy refusal; cannot identify old live site |
| Master governance | 19-repo, 23 Firebase-ID inventory, evidence tier and all worker handoffs, never implicit release approval | Labs registry #262 and Staging intake #279/#280 |

No authenticated, source-to-source and cloud-authorized **consent → Privacy grant → Studio plan → Jobs render → protected output → Spatial Replay → revoke → deletion → late-write denial / downstream purge** real test receipt is present. Some source gates are deliberately hard-OFF until separate admission. A staging source PASS cannot certify this or production.

## 8 — Critical open gates and strictly limited safe next commands

1. **Source/governance:** refresh PR #176, #180, #182 and this documentation branch head; select one owner-reviewed final engineering commit. Do not merge without preserving both donors and R887 test enrollment; enforce actual protected main and independent required jobs.
2. **Run authentic current source:** isolated, owner-approved zero-unapproved-cost machine Node22/Java21, clean detached original #180 head, no ADC/Firebase token, no real data:
```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
git fetch origin 0d9cdd67ef75071ee69a7fde1e168a1d0a263139
git checkout --detach 0d9cdd67ef75071ee69a7fde1e168a1d0a263139
test "$(git rev-parse HEAD)" = "0d9cdd67ef75071ee69a7fde1e168a1d0a263139"
test -z "$(git status --porcelain --untracked-files=all)"
test -z "${GOOGLE_APPLICATION_CREDENTIALS:-}"
test -z "${FIREBASE_TOKEN:-}"
node --version
java -version
node --test scripts/test-r887-release-acceptance-wiring.mjs
npm --prefix functions ci --ignore-scripts --engine-strict --audit=false
npm run test:r816:capacity
npm --prefix functions run test:synthetic-lifecycle:http-emulator
npm run check
npm run check:deploy
```
   Capture SHA/tree, lockfile hash, npm/toolchain, all named test exits and logs, emulator project, 23/23 real callable status and zero residual bytes. A correct source admission denial must remain a denial if owner evidence is missing. Never forge identities/grants.
3. **Four-emulator:** separately execute R451 original identity+40-test under same disposable Auth/Firestore/Storage/Functions emulators at exact reviewed source, including earlier Unix socket `EPERM` issue; do not treat three-emulator as four-emulator.
4. **Protected CI:** resolve zero-step hosted startup via account support and owner consent; rerun exact reviewed SHA on compliant provider without bypass; prove independent non-author reviewer, required checks, job logs and artifacts.
5. **Provider readback:** owner-authorized **GET-only** Hosting live releases/versions, Rules hashes, Functions API+Cloud Run revisions, IAM/service identity, WIF, Auth, Storage, Firestore, Cloud Scheduler, billing state, site domain and rollback. No token values, real user records, old media downloads. Compare to source ledger and existing owner R286/R287 historical provider snapshot.
6. **Rules and Communications:** resolve Rules publisher collision; source-pin Communications with protected verification; require current source-safe secrets reference by name, trial send disabled by default.
7. **Release rehearsal:** only with explicit separate approval, apply exact source-bound staging prebuilt, a distinct previously recoverable rollback release, verified WIF, real mutation receipt and genuine negative HTTP/robots/health/buildinfo; monitor recovery. **No deployment authorized by this audit.**
8. **Private runtime and devices:** approved owner-private signed issuer→protected playable MP4/SRT→Replay→revocation/deletion including old signed links and privileged GCS late writes, cross-owner/tenant isolation. Browser, keyboard, accessibility, reduced-motion, captions, languages, real Windows/iOS/Android/XR, literal founder AAA+++ visual acceptance. Independent production owner GO *after* all gates.

## 9 — Evidence retention, conflict and no-action receipt

Current R890 16 SHA256 segment files and coverage index are durable documentation on a **dedicated draft review branch**, not source or production. Original packs #177→#181, R889 #182, the separate R840 #176 and R887 #180, original October/November archives, historic Cloud Shell provider evidence and worker source branches are preserved unchanged.

The container available for native testing cannot resolve GitHub DNS, so no cloned full source checkout, `npm ci`, Node native original test, Firebase emulator, protected CI, cloud live checks, billing action, paid compute, production deployment, current device test or private user media access occurred in R890. All verifications beyond byte inventory/structural source inspection remain **NOT RUN / UNKNOWN**, not PASS. Release HOLD stays enforced.

**Required successor:** Start with the next-worker R890 short handoff; use this full chapter and the 16 machine ledgers as exact-byte provenance; refresh head SHAs, then execute actual authentic source tests and provider readback in the order above. Never translate a static/binary hash into deployment success.
