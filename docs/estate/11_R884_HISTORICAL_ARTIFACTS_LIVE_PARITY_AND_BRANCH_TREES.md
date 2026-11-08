# R884 — Staging full branch-head provenance, original artifact byte evidence, and live parity continuation

**Observed:** 2026-11-07 Central / 2026-11-08 UTC. **Documentation only; Staging LIVE HOLD / PRODUCTION NO-GO.**
**Prior Staging audit:** [draft PR #178](https://github.com/LifeLoggerAI/urai-staging/pull/178), head `bc98673cb198d60335238db0fcf78d8279dd8b33`. This worker continuation is independently stacked on that audit head; original source PR #176 and starter PR #177 are untouched.

## 1. All currently visible Git branch-head trees: now inventoried

Expanded the initial two-ref [MANIFEST.json](MANIFEST.json) and [BRANCH_REFS.json](BRANCH_REFS.json) into [branch-trees/INDEX.json](branch-trees/INDEX.json) plus **12 fully recorded recursive-tree JSON segments** under `branch-trees/`, each with exact branch name, immutable commit SHA, actual tree SHA, Git blob paths, blob SHA-1, declared byte length and recursive API truncation state.

| Metric | Read-only GitHub result | Proper scope |
|---|---:|---|
| Visible branch heads (includes newly created independent documentation lane) | **180** | Current branches, not every historical commit or tag |
| All Git blob path occurrences across these heads | **28,540** | Duplicates across branch refs intentionally retained |
| Sum of branch-ref blob metadata bytes | **201,390,308** | Repeated shared blobs; **not** 201 MB unique source |
| Distinct Git paths across all branch heads | **299** | Only current reachable branch head paths |
| Distinct blob object SHAs across all head trees | **826** | **Not** independently SHA256-hashed all 826 |
| Distinct tree object SHAs | **173** | Historical branches often share tree |
| Truncated tree responses / fetch failures | **0 / 0** | GitHub recursive-tree API branch-head enumeration only |

The earlier full source baseline remains `main` `bda659ad23590b39e7f32de349f8a3723455ce02` (147 files/1,054,519 declared bytes) and R840 PR #176 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` (244 files/1,715,705 declared bytes). Its 213-commit-ahead status is compare metadata, not a full traversal of historical commits. No deleted branch, tag, unreachable object, GitHub-run historical artifact enumeration, private submodule or LFS content is certified complete.

### Byte-verified critical R840 source subset
[Full original byte SHA256 records](R840_CORE_SHA256.json) pin **11 of 244** files, **418,238 retrieved bytes**, all matching GitHub-declared file sizes. These include `.firebaserc`, `firebase.json`, both source/deploy workflow files, `config/staging-consumers.json`, Functions lockfile/package metadata, original synthetic lifecycle+Storage residue source, original R840 capacity test and actual HTTP callable emulator runner. SHA256s were computed from the returned original UTF-8 blob data using an independently test-vector-checked digest implementation. Do not generalize this subset to remaining blobs; the exact Git blob names originate from GitHub Git Trees.

## 2. Original October 17 GitHub Actions artifact ZIPs: actual byte checks

Retrieved original GitHub-hosted artifacts using Actions artifact download. All four full ZIP SHA256 values **match the GitHub Actions reported artifact digest**.

| Artifact ID, run | ZIP bytes/digest SHA256 | Read archive member scope |
|---|---|---|
| `12110930720` [CI 39058851765](https://github.com/LifeLoggerAI/urai-staging/actions/runs/39058851765) | `3da2df1a19897d3f7df51c000757b083bf568dda083321ce298d5f10d1ae5955` | CI bootstrap JSON/MD + installed security JSON (3 files) |
| `12110297811` [Verify 39058851791](https://github.com/LifeLoggerAI/urai-staging/actions/runs/39058851791) | `b172f6a81726c35128a680b2ed1b8e9ca466a5d368b79e152832b83273dff790` | Verify bootstrap JSON/MD + installed security JSON (3 files) |
| `12109918520` [cross-service 39058851767](https://github.com/LifeLoggerAI/urai-staging/actions/runs/39058851767) | `9f58633c8e0a2f938f2c34f8ea70ad4fe895e18aa9e1c41205613dc51a0499e6` | Authenticated emulator, upstream contracts, Spatial C1 and source bindings (4 files) |
| `12109813820` [CI 39058851765](https://github.com/LifeLoggerAI/urai-staging/actions/runs/39058851765) | `7d3f5daa54184d12f1d7726003df1e8cb058f2455a7ed2334b135d2c5f787857` | 12 screenshots, original browser JSON and HTTP log (14 files) |

**Historical exact Staging source for all four:** `9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9`, not R840 and not currently deployed Staging. The archived `staging-bootstrap-report.json` records 15/15 source bootstrap commands success, including frozen `npm --prefix functions ci --ignore-scripts --engine-strict --audit=false`; `cloudDeploymentPerformed:false`, `liveSmokePerformed:false`, `providerMutationPerformed:false`. A `sourceBootstrapScore:100` must **never** be called launch readiness or production health.

`authenticated-emulator.json` records **40 checks passed** using real local Firebase Auth/Firestore/Storage/Functions emulators on `urai-staging-test` with synthetic fixtures. It explicitly records `cloudAuthenticated:false`, `cloudStagingDeployed:false`, `jobsWorkerAndPrivacyRuntimeServiceIntegrated:false`, `revocationServerPropagationVerified:false`, `productionAccessOrSpending:false`, `finalReleaseAccepted:false`.

Original browser JSON records 16 route/scenario observations, 13 interactions, zero captured page errors, console errors, failed requests or evidence failures, and 522 JavaScript requests. Browser source is **Spatial** `b0318f4251f8f47ef5f232a54c6e52dc637116c7`, served from an **isolated compiled static frontend**, not currently deployed staging or production. The artifact explicitly marks `authenticatedBackendVerified:false`, `lifeMoviesVerified:false`, `finalArtAccepted:false`, `deployed:false`. Screenshot presence does **not** certify founder visual approval or actual physical mobile/XR hardware.

## 3. Original Nov 6 R793 three-emulator donor ZIP independently verified

Fetched source-referenced Google Drive archive [ONE URAI GENESIS Lifecycle R793 Evidence](https://drive.google.com/file/d/1vdrwF3R1D3mZCqCwvFbXmp89KAgjn3gw/view), ZIP **SHA256 `57325f7341a2f11c06a0738afff7a580e0277291a122acb70da7c4ba494f4bcc`**, byte-identical to the donor PR #174-referenced checksum. Archive has **16** files. Its `SHA256SUMS.json` lists 15 other entries and **15/15 original member-content hashes independently matched**; no unlisted member remains.

`actual-lifecycle-receipt.json` contains exactly 21 uniquely named passing checks on Staging PR #174 commit `f2d8130406fe5a65a5863efa2337eca5b8521121`, tree `05d8820aec8b1da32a237199610b68e492ee511f`. The original retained TAP logs record **322/322 Staging native cases** with zero failures/skips and **5/5 Storage SDK tests** with no failures, plus exact-source compile/frozen-install and three-real-emulator synthetic authenticated callable HTTP coverage. This is stronger than donor PR prose, but **not current PR #176** and **not four-emulator/production service acceptance**.

R793 also contains separate Spatial #2026 `25791327050369872be6672369f29a9c8430b438` source logs (Next build 152 pages, 229 unit suites, 1712/1712 Functions cases, six HTTP routes). These belong solely to that historical Spatial source and include `clientInteractionVerified:false`. HTTP server SIGTERM after six routes was intentional cleanup, not evidence of a live deployed product. These logs do not certify current Spatial source, render, playable MP4, XR, production or consent issuer.

## 4. Fresh outside-in Staging observations, not provider-side deployed revision

Read-only website fetch of four URLs:
- `https://urai-staging.web.app/` resolved to `/home` and displayed **“Home experience stalled”**.
- `/api/healthz`: HTTP **404** via external page fetch.
- `/api/buildinfo`: HTTP **404** via external page fetch.
- `/robots.txt`: returned a policy with `Allow: /`, `Allow: /u/adamclamp`, `Disallow: /api/` and sitemap pointing to `urai.app`; it does **not** match source `public/robots.txt` all-disallow staging intent.

This observed current outside-in response differs from the repository-defined staging shell, endpoint rewrites, index policy and source/release fingerprint. It does **not** prove which repository/source SHA the live site serves, whether the provider route is stale/wrong-target, or who owns current hosting release. **Provider-native read-only Firebase Hosting release/version and deployed-source hashes are the P0 next evidence.** Historical Sep24 503 is now a distinct earlier observation, not current status.

## 5. Review/CI authority at present

Current Staging `main` is `bda659ad23590b39e7f32de349f8a3723455ce02`, reported `protected:false` by GitHub branch API, while repository-wide rulesets list returned `[]` and actual main protection endpoint returned **403 Resource not accessible by integration**. This does not prove other enterprise-level policy absence, but **cannot establish enforced branch protections or source approval**. PR #176 and #178 currently have **zero native submitted review records** when independently queried.

PR #176 head R840 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b`: [CI 42335811356](https://github.com/LifeLoggerAI/urai-staging/actions/runs/42335811356) and [Verify 42335811359](https://github.com/LifeLoggerAI/urai-staging/actions/runs/42335811359) both reported failed jobs with **zero recorded steps**. Later Staging audit PR #178 head `bc98673cb198d60335238db0fcf78d8279dd8b33` similarly received [CI 42443774879](https://github.com/LifeLoggerAI/urai-staging/actions/runs/42443774879) and [Verify 42443774805](https://github.com/LifeLoggerAI/urai-staging/actions/runs/42443774805), both failed with no executed steps. This strongly limits hosted evidence, **not proof that source code tests failed**. Account billing/eligibility issue #4889576 remains provider/admin-dependent; do not assert specific present cause without provider readback.

## 6. Environment and deployment parity

- GitHub source `.firebaserc` only `default/staging` -> `urai-staging`, no production alias.
- `firebase.json`: staging Hosting rewrite to Staging Functions, Functions `nodejs22`, Firestore rules/indexes and Storage rules.
- Candidate Functions lockfile resolves `firebase-tools 15.32.1`; protected deploy workflow installs independent CLI `15.23.0`; compatibility remains untested current-head. Earlier `ENVIRONMENT.md` says Node20, superseded by Node22 source.
- Protected workflow demands exact unchanged `main` source/rollback ancestor; prebuilt manifest, credential-free build, separate WIF ephemeral credential, owner-approved `staging` environment, readback and receipt-bound nonmutating smoke. **Actual effective IAM, WIF availability, budget, existing site, deployed SHA and rules/version hashes have not been read back**.
- Communications consumer registry allows synthetic-scoped Twilio-trial/SendGrid test workflows only; old Admin/Spatial bindings are historical. Real user private memories and production provider access remain excluded.
- `UrAi-Dev`, `UrAiProd`, old `UrAi` are not automatic source-to-live mappings. Canonical consumer UX requires separate `urai-spatial` and original signed private Consent→Jobs→Studio→Replay integration acceptance.

## 7. Next exact execution sequence, no unapproved spend

On a clean authorized **zero-unapproved-cost** local runner with network to GitHub/npm, Node22 and Java21, use the source `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` and instructions in [08_NEXT_WORKER_HANDOFF.md](08_NEXT_WORKER_HANDOFF.md). Require full frozen install and root suite, `npm run test:r816:capacity`, actual **23/23** callable HTTP on Auth/Firestore/Storage, then distinct four-emulator Functions acceptance. Record source SHA, tree, npm lock/SDK versions, exact command exit and original log hash. Do not borrow the archived donor 21/21.

In parallel seek **read-only** provider IAM/Hosting revision and GitHub billing/runner/branch-protection evidence; no deploy, permission mutation, site creation, cloud spend, forced PR merge or real private data reads from this document. After independent review and owner-governed staging authorization, protected exact-main checks-only before any live staging deploy. Only authorized positive protected consent/Jobs/Studio/Replay and physical-device acceptance may advance production GO. Staging PASS is never automatic production or physical-device certification.

**Audit method limitations:** The managed execution container has Node 22 and Java 21, but GitHub/npm DNS is unavailable and Firebase package dependencies are absent. Therefore this worker **did not run** the latest R840 original build, 23/23 or four-emulator. Old ZIPs and original logs were downloaded and independently hashed, not regenerated under R840. 180 branch-head trees were inventoried as Git metadata, not all historic blobs read/SHA256-hashed; only the 11 release-critical R840 files in `R840_CORE_SHA256.json` have new exact bytes+SHA256 in this continuation. GitHub `main` and all source donor branches remain unchanged.

**FINAL:** source/metadata inventory stronger, historical evidence independently byte verified, current live parity **FAILING/UNVERIFIED IDENTITY**, native R840 **PENDING**, cloud staging **HOLD**, production **NO-GO**, physical devices **NOT CERTIFIED**.
