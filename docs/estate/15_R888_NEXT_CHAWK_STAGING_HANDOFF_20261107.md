# ONE URAI GENESIS — R888 NEXT CHALK WORKER: STAGING / RELEASE PIPELINE HANDOFF

**Snapshot:** November 7, 2026 (22:37+ America/Chicago) / November 8 UTC. **Maintainer lane:** documentation only, stacked *after* Staging audit #179; release source still lives in separate #176/#180 engineering reviews. **Status: STAGING LIVE HOLD / PRODUCTION NO-GO / PHYSICAL DEVICE UNVERIFIED**.

## First action: preserve other workers, do NOT restart an audit

Read, in order:
1. [Private Labs Genesis canonical registry draft #262](https://github.com/LifeLoggerAI/urai-labs-llc/pull/262): `docs/estate/00_START_HERE.md`, `WORKER_PROTOCOL.md`, `EVIDENCE_STANDARD.md`, `REPOSITORIES.json`, `CROSS_SYSTEM_LEDGER.md`, `WORKER_INBOX.md`. This is a **draft registry**, not the signed production authority.
2. [Staging starter #177](https://github.com/LifeLoggerAI/urai-staging/pull/177) → [full initial source audit #178](https://github.com/LifeLoggerAI/urai-staging/pull/178) → [branch+byte+artifact/live-site continuation #179](https://github.com/LifeLoggerAI/urai-staging/pull/179). Read `docs/estate/00_START_HERE.md` and chapters 01–13, `MANIFEST.json`, `BRANCH_REFS.json`, `branch-trees/INDEX.json`, `R840_CORE_SHA256.json`, `R886_LEGACY_REFUSAL_NATIVE_RECEIPTS.json`.
3. [Implementation donor #174](https://github.com/LifeLoggerAI/urai-staging/pull/174) 21-case real three-emulator callable HTTP; [capacity donor #175](https://github.com/LifeLoggerAI/urai-staging/pull/175) R816 128-node transaction; [converged source #176](https://github.com/LifeLoggerAI/urai-staging/pull/176) R839/R840; [new R887 test-enrollment review #180](https://github.com/LifeLoggerAI/urai-staging/pull/180). **Do not erase or rewrite donor branches.**
4. [Private Labs staged evidence intake #279](https://github.com/LifeLoggerAI/urai-labs-llc/pull/279), [later staging/provider/live handoff #280](https://github.com/LifeLoggerAI/urai-labs-llc/pull/280). There are **many parallel system workers**, including [Labs Communications intake #281](https://github.com/LifeLoggerAI/urai-labs-llc/pull/281) and [Labs shared Rules-collision #261](https://github.com/LifeLoggerAI/urai-labs-llc/pull/261). Do not merge intake PRs to each other automatically.

This handoff was prepared **after discovering other active workers**. Each source's branch head **must be re-read** before continuation. No claimed future-state or review signoff follows from an open PR.

## Frozen source identity — distinguish three clocks

| Role | Immutable SHA / PR | Evidence level |
|---|---|---|
| Staging `main` | `bda659ad23590b39e7f32de349f8a3723455ce02` | Git tree: 147 tracked files / 1,054,519 declared bytes, main not automatically protected |
| Donor real callable HTTP | #174 `f2d8130406fe5a65a5863efa2337eca5b8521121` | Original R793 21/21 real Auth+Firestore+Storage callable; 322/322 suite/5/5 Storage SDK in original donor artifact; historical |
| Donor capacity | #175 `1e9b8c7f0044450c0a9f0750d33ab36d2324c851` | 3/3 in-memory original capacity fixture, **not** real Firebase |
| Converged latest tested-*source candidate* | #176 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | 244 tracked files / 1,715,705 declared bytes; **23 callable expected, no native 23/23 R840 proof** |
| Proposed R887 workflow fix | #180 `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | Three workflow enrollments; native wiring 4/4 on minimal synthetic fixture, 2 negative mutations correctly refused; **not merged or current whole-source pass** |
| Full forensic docs | #179 `76023604897f545b14577a2d2a02ecf6c87a1b94` | Full branch-head metadata, original artifacts, selected source SHA256 and current live-site discrepancies |
| Historical hosted full CI | Staging `9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9` (Oct 17) | Genuine executed CI, Verify, cross-service and browser evidence; **does not transfer** |
| Live deployed Staging Hosting | **UNKNOWN** | Public `/__/firebase/init.json` identifies project `urai-staging`; no authorized Hosting version/source/deployer readback |

`#180` is **stacked on #176**, whereas this documentation is **stacked on #179**. Convergence requires an independent reviewer and source-bound acceptance, **not** a blind branch merge.

## What the previous workers genuinely accomplished

- 180 accessible Staging branch-head Git trees inventoried, untruncated: 28,540 branch/file references, **826 distinct blob SHAs** and 299 distinct paths; raw original full-history bytes not verified. `R840_CORE_SHA256.json` contains **11** independently hashed release-critical original Git blobs, 418,238 actual retrieved bytes; it is not a 244-file raw-byte audit.
- Four original Oct 17 GitHub Actions artifact ZIPs were independently retrieved and their ZIP SHA256 verified against GitHub digests. Original reports prove historical source-pinned **40/40 synthetic four-emulator checks**, 16 static browser scenarios and 13 interactions; they explicitly deny current private-media/cloud/device certification.
- R793 original Drive evidence archive independently SHA-256 verified, 15/15 member digests verified: donor #174 original 322/322 staging suite, 5/5 genuine Storage SDK, and 21/21 3-emulator callable HTTP. Do not call these R840 23/23, cloud, or production tests.
- R887 #180 directly enrolls both `npm run test:r816:capacity` and `npm --prefix functions run test:synthetic-lifecycle:http-emulator` in normal CI, URAI Production Verify and **credential-free** Staging Deploy Lock preflight. New original Node test 4/4 PASS on small synthetic fixtures, deliberate missing-command and missing-artifact-seal mutations both FAIL. Full original npm/frozen build, true R887 23/23 and four-emulator remain unexecuted.
- Original legacy `UrAi`, `UrAi-Dev`, `UrAiProd` deployment entrypoints were byte/Git-verified and locally executed; 3/3 correctly exit 1 refusing deploy. Historical guidance still carries an invalid same-channel-to-itself `hosting:clone` rollback example. These refusal tests **do not** identify or erase a prior deployed site.
- No production deployment, Firebase IAM/billing mutation, real private user-memory access, paid compute, GitHub Actions dispatch, owner consent issuance, or source branch force-push occurred in this audit sequence.

## P0 live Staging inconsistency (do not guess cause)

Public external read-only observation at `https://urai-staging.web.app`:
- `/__/firebase/init.json` reports project ID `urai-staging`, so the public Firebase project identity is plausible.
- Root redirects/lands on `/home` with **“Home experience stalled”**, matching original `LifeLoggerAI/UrAi/src/app/home/error.tsx` at SHA `8cac3ba513830c11261d57bc2b5dd7ad8b83e85a`.
- Live `robots.txt` allows crawlers on paths and points at a production sitemap; matches the legacy `UrAi/src/app/robots.ts`, **not** canonical Staging's all-disallow source `public/robots.txt`.
- `/api/healthz` and `/api/buildinfo` returned **404** rather than canonical staging JSON identity. Exact origin/Hosting release revision/deployer **NOT PROVEN**.

**Read-only next provider gate:** owner-authorized Firebase Hosting `sites/urai-staging/channels/live/releases` list and referenced `sites/urai-staging/versions/{id}` GET. Compare release timestamp, version, rewrites/redirects/headers with `firebase.json` and actual published Functions/Rules; no IAM escalation or `firebase deploy`. The official API procedure is in `docs/estate/12_R885_LIVE_STAGING_FINGERPRINT_CI_AND_READONLY_HOSTING_PROOF.md`. Do not inspect public sample-profile content or private user records.

## P0 external runner/governance

- Current Staging #176 and #180 CI/Verify failed **before recorded test steps**. These results cannot establish a source-code failure or passing source tests. GitHub account-level billing notice and existing [Support case #4889576](https://support.github.com/) are owner-dependent; do not alter payment or dispatch speculative runs.
- Read-only GitHub branch API reported `protected:false` for **all 19** accessible default branches as of this handoff. Treat as **source governance warning**, not full enterprise/org rulesets proof; the protection details API was 403 to the installed GitHub App.
- Six-system cross-service evidence and shared Firebase policy publisher overlap remain unresolved. Read [Labs #261](https://github.com/LifeLoggerAI/urai-labs-llc/pull/261) before considering any Firestore/Storage Rules or default Functions namespace publication. Staging `firebase.json` deploy includes Hosting, Functions, Firestore Rules/indexes and Storage; an approved staging deploy must not silently claim cross-repo or production authority.
- 23 founder-supplied Firebase IDs in master registry are **not live authenticated provider inventory**. Current true billing/IAM, WIF, Hosting release, API endpoint state and rollback are not certified. Node22 is current executable; `ENVIRONMENT.md` Node20 prose historical; locked `firebase-tools 15.32.1` vs protected deploy CLI15.23.0 needs actual compatibility receipt.

## Cross-system audit workers: source pointers, don't duplicate

| Domain | Independent worker review | Integration that Staging must not claim without evidence |
|---|---|---|
| Privacy | [audit #238](https://github.com/LifeLoggerAI/urai-privacy/pull/238) | current C6 positive signed issuer, revocation/export/deletion, owner/foreign-user denial |
| Jobs | [R891 handoff #369](https://github.com/LifeLoggerAI/urai-jobs/pull/369) | current owner/tenant/org enforcement, quota, late Storage/GCS writes, private output |
| Studio | [R888 source review #197](https://github.com/LifeLoggerAI/urai-studio/pull/197) | protected MP4/SRT output, server-owned jobs/audit, active membership, Consent→Replay |
| Spatial | [release safety #2073](https://github.com/LifeLoggerAI/urai-spatial/pull/2073) | Home→Ascent→Life Map→Focus→Replay→Escape, live build/site/rollback, devices |
| RuAi | [portal audit #78](https://github.com/LifeLoggerAI/B2Bportal/pull/78) | org/clinician separation and shared Firebase Rules ownership |
| Admin | [master handoff #99](https://github.com/LifeLoggerAI/urai-admin/pull/99) | privileged access, shared Rules/Functions publisher, private media nonaccess |
| Communications | [forensic #102](https://github.com/LifeLoggerAI/urai-communications/pull/102) | server-owned opt-out/suppression, provider billing, consented send, synthetic boundaries |
| Asset Factory | [forensic #496](https://github.com/LifeLoggerAI/asset-factory/pull/496) | source/rights of models, binaries and provider retention; no inferred licensed runtime asset |
| Content / Storytime | [Content #114](https://github.com/LifeLoggerAI/urai-content/pull/114), [Storytime #99](https://github.com/LifeLoggerAI/urai-storytime/pull/99) | generated narrative/source monitoring, publishing/data rights, real memory provenance |
| Marketing / Analytics | [Marketing #62](https://github.com/LifeLoggerAI/urai-marketing/pull/62), [Analytics #88](https://github.com/LifeLoggerAI/urai-analytics/pull/88) | consent, minimized telemetry, no unverified production/metric claims |
| Foundation / Investors | [Foundation #65](https://github.com/LifeLoggerAI/urai-foundation/pull/65), [Investors/registry #270](https://github.com/LifeLoggerAI/urai-labs-llc/pull/270) | actual governance/rights/IP/contract status, not commercial launch approval |

These are **open review submissions**, not proof that all audits are complete, accepted, merged, production-deployed or that no other worker has newer work. Do not conflate documentation with active engineering branches. Full current 19-repo handoff/ref snapshot is maintained in the **private Labs** continuation, not here.

## Exact next owner-approved, no-unapproved-cost native commands

Only after verifying live PR #180 head and finding a network-capable, isolated, **approved** zero-unapproved-cost machine with Node 22, Java 21, clean source, no real user data and **no Google ADC/Firebase cloud token**:

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

Save exact SHA+Git tree+lockfile digest, Node/Java/npm/SDK versions, command exit status, unredacted test stdout **only in private approved evidence custody**, SHA256 receipts and explicit non-acceptance for failed/missing tests. Four-emulator **Functions** acceptance needs a separately authorized native execution using current unmodified implementation and original test harness; this `--only auth,firestore,storage` command is **three** emulators and cannot certify the fourth. `verify:privacy-jobs:admission` may correctly deny in the absence of owner-approved identity; do not forge one to make it green.

**Never execute without separately documented owner authorization:** `firebase deploy`, `npm run deploy:staging`, any live GitHub Staging Deploy Lock dispatch, source merges, protected Rule or IAM changes, paid cloud/Runpod compute, provider sends, owner data import, C6/grant enablement or production promotion.

## Handoff stop conditions

- Native source tests missing/dependency unavailable? Mark `NOT RUN`, do not claim PASS.
- Host release identity unavailable? Preserve source-match hypothesis and `UNKNOWN DEPLOYER/REVISION`, no arbitrary site overwrite.
- Contending Rules/Functions publishers unresolved? Refuse cross-system publish.
- Signed owner privacy/Jobs/Studio→Replay real private media and deletion/late-write denials missing? Production HOLD.
- Device/browser/XR/keyboard/captions/RTL/languages incomplete? Separate device HOLD.
- Independent reviewer, source-bound CI, explicit human owner GO and rollback absent? Remain HOLD.

**Next Chalk task is to move these exact pending gates using original-source and provider-backed receipts, not recreate workers' already-preserved audits. A STAGING PASS NEVER AUTOMATICALLY CERTIFIES PRODUCTION OR PHYSICAL DEVICES.**
