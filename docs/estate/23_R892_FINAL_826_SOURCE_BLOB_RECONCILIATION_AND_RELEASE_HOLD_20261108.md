# ONE URAI GENESIS — R892 FINAL COMPLETE HISTORICAL BLOB FORENSIC RECONCILIATION

**Captured evidence window:** Original R884 Staging source snapshot of 180 accessible GitHub branch heads, reviewed 2026-11-08 Central / 2026-11-09 UTC. **Decision: SOURCE-BYTE INVENTORY COMPLETE FOR THIS CAPTURED SNAPSHOT. STAGING LIVE HOLD / PRODUCTION NO-GO / PHYSICAL DEVICE UNVERIFIED.**

## 1. What was actually verified — no metadata shortcut

R890 previously fetched original R887 current-release-candidate Git source and SHA-256 verified **247/247 blobs / 1,726,287 bytes** at commit `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` (actual tree `95a120a86fe35aa4f7a1f7e4030b0fdff02fe825`). Among those, **239 original Git blob identities / 1,673,017 bytes** also appeared in the earlier R884 180-branch-head snapshot. R891 separately corrected R884's `tree_sha` commit-SHA mislabel by fetching **180/180 actual Git commit objects**, yielding **167 distinct true Git trees**, and independently deduplicated historical source metadata into **826 distinct blobs, 299 paths, 6,984,576 distinct declared bytes**, from **28,540 repeated branch/path occurrences**.

R892 retrieved **all remaining 587 historical-only unique Git blob objects**, based on [frozen 587-object worklist](manifests/R892_587_HISTORICAL_UNIQUE_BLOBS_WORKLIST.json), via exact GitHub original blob object ID. Each retrieved UTF-8 source was independently SHA-256 hashed (custom deterministic SHA256 tested against known `abc` reference vector) and its byte length compared to original Git-tree-declared byte size. R892 preserved **37** original per-blob-range JSON segments, `R892_HIST_BYTES_000_016.json` through `R892_HIST_BYTES_576_587.json`, with each row containing the exact blob SHA-1, representative original path, declared byte size, observed byte count, SHA-256 digest and explicit state. No source bodies or secrets are copied into these evidence manifests.

**Final aggregate cross-verification:** Three aggregate segment validators for worklist ranges [0,256), [256,512) and [512,587) checked all 37 manifests for exact ordered blob identity, observed size, `verified` status and valid SHA256 syntax. The final [826-blob machine source-byte proof](manifests/R892_COMPLETE_826_HISTORICAL_BLOB_BYTE_PROOF_20261108.json) independently joined R890 historical SHA coverage and the 587 new R892 objects against the original R891 deduplicated census and immutable worklist; **0 missing rows, 0 identity/size mismatches, 0 manifest read errors, 0 duplicate historical objects; 826/826 original blob identities and 6,984,576/6,984,576 unique byte coverage.**

| Exact proof | Distinct Git blobs | Original byte coverage |
|---|---:|---:|
| Historical R884 180-head snapshot | 826 | 6,984,576 |
| R890 exact R887 source overlapping the historical snapshot | 239 | 1,673,017 |
| Additional R892 historical-only original Git objects | 587 | 5,311,559 |
| **Verified historical source snapshot** | **826 / 826** | **6,984,576 / 6,984,576** |
| Remaining unique Git blobs in this *captured* snapshot | **0** | **0** |

**Crucial scope:** This does **NOT** mean every Git commit since 2024 was traversed, or that every deleted/unreachable branch, tag, LFS binary, CI ZIP, native compiled output, external archive or cloud Storage object was inspected. R884's 180 branch heads are a captured set, not the entire repository's all-commits history or every current branch. The R890 current candidate has its own separate 247/247 fully byte-hashed proof. File SHA256 verifies retrieved bytes, not semantic behavior, dependency build, runtime security, service readiness or release.

## 2. Original implementation and precise responsibility

`LifeLoggerAI/urai-staging` is an actual developed Firebase staging release-validation shell with:
- `.firebaserc` staging/default project `urai-staging`; `firebase.json` Hosting site `urai-staging`, public staging/static/noindex shell, /api companion/waitlist/healthz/buildinfo rewrites, Node22 Functions, Firestore indexes+Rules, Storage Rules, and Auth/Firestore/Storage/Functions/Hosting local emulator services.
- Original source controlled staging APIs, authentication/origin, consumer authority, protected cross-repo source verification, strict no-production consumer and provider trial fencing, CI/test routines, WIF/OIDC protected deploy lock, exact SHA release and rollback ancestry, prebuilt artifact manifest/source-tree hashing, smoke and negative-denial validation.
- Original synthetic callable lifecycle implementation with emulator-project `urai-staging-test` guards, server-issued synthetic consent receipt, expiry/revocation, owner-only reads, transactional 128-node Life Graph capacity and ancestor provenance, no-after-revoke and duplicate/deletion/storage residue assertions, source-specific original 23-case three-emulator expected acceptance.
- It is not canonical Spatial web UI, deployed private Studio/Jobs renderer, private Privacy owner-consent production authority, or evidence that live Firebase service revisions actually match current source.

Do not conflate historic LifeLogger/UrAi/UrAiProd/UrAi-Dev Hosting files with authoritative current Spatial product source. Do not assume staging Functions/Firestore/Storage deployments are authorized for shared production namespace or a distinct professional RuAi tenant.

## 3. Exact source and historical test ledger

| Lane | Exact source commit | What the evidence actually establishes |
|---|---|---|
| Default Staging `main` | `bda659ad23590b39e7f32de349f8a3723455ce02` | 147 file / 1,054,519 declared-byte main source; `main` reported unprotected; no current published Hosting identity proof |
| Donor #174 | `f2d8130406fe5a65a5863efa2337eca5b8521121` | Historical original 322/322, real three-emulator 21/21, Storage SDK 5/5 donor scope; valid but different source |
| Donor #175 | `1e9b8c7f0044450c0a9f0750d33ab36d2324c851` | 128-node capacity 3/3 in-memory donor; not Firebase capacity acceptance |
| Converged R840 #176 | `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | 244 file / 1,715,705 declared-byte converged source, 23 expected real callable; original current acceptance not run |
| R887 #180 | `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | 247/247 original-byte hashes and 3/3 workflow source-order checks; **not native full build/23/23 real emulator** |
| Historic Oct 17 hosted source | `9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9` | Real successful hosted CI/cross-service/Verify and historic original ZIP hash receipts; source-stale |
| R891 docs #184 | `4a25c1b69e33b9340f3c839f4fdc2292ccbe6910` | Corrected 180 actual Git tree objects and historic 826 distinct blob corpus; not product runtime |
| R892 docs #185 | New review-only branch descendant of #184 | Fully recovered additional 587/587 original historical Git objects; does not mutate engineering |

Staging #173, #174, #175, #176, #180 implementation donors and docs #177–#185 must remain intact. These branches were draft/unmerged at prior verified readback; refresh before acting. Previous source helper and Rules regression tests are built, not merely proposed. No new development was required to accomplish this forensic byte audit.

## 4. Release blockers that source-forensic completion does NOT clear

1. **R887 current source native execution:** original `npm --prefix functions ci --ignore-scripts --engine-strict --audit=false`, Node22/Java21, `node --test scripts/test-r887-release-acceptance-wiring.mjs`, capacity, `npm --prefix functions run test:synthetic-lifecycle:http-emulator` actual real Auth/Firestore/Storage **23/23**, full build/check/deploy check and genuine separate four-emulator R451 Functions 40-check source-bound acceptance. NOT RUN HERE (local GitHub DNS unresolvable). Source 247/247 SHA256 does not make these PASS.
2. **Protected GitHub CI/reviews:** R887 CI run `42447439250`, Verify `42447439206` failed with zero executed steps; logs fetch BlobNotFound; no artifacts. R890 docs-head CI `42558237798` also failed with runner_id=0; #176/#180/#183 no independent submitted reviews when checked. Exact root cause (runner admission vs billing/permissions) not proved; GitHub owner support #4889576 outstanding. Main GitHub API reported `protected:false`, no effective required approval proof. No bypass or unapproved paid runner.
3. **Live staging provider/source parity:** historical R885 public site project `urai-staging` but website body/robots/rewrite/API fingerprints apparently pointed to legacy UrAi rather than current staging source. `/api/healthz`, `/api/buildinfo` historically 404; fresh public GET unavailable. No authoritative live Hosting release-version/source SHA/deployer or effective current Auth/IAM/Rules/Storage/Functions/Cloud Run/Scheduler/billing/rollback; older R286/R287 Nov1 owner inventory remains historical. Required separate authorized GET-only effective provider readback.
4. **Consumer exact source pin:** Staging `config/staging-consumers.json` two active communications synthetic-only consumers and `scripts/validate-staging-consumers.mjs` hardcode `759f664cdf00a48272f5401b7cfc45bbd8afb537`; separate current Communications `main` observation was `40cd2f4b6d422734869486a49cddac9e103a58f1`, 22 commits ahead. Requires owner review and coordinated config+validator+protected-ref tests; mismatch is not evidence of actual sending.
5. **Toolchains / Rules publisher / rollback:** Functions locked firebase-tools15.32.1 vs governed deploy Firebase CLI15.23.0, compatibility not run. Firebase Rules collision/ownership Labs #261 (Spatial/RuAi/Admin/Staging) unresolved. Actual prebuilt SHA+tree, protected WIF/IAM review, previously live recoverable rollback version, no-active-customer mutation receipt and smoke are unverified; no staging or production deploy authorized.
6. **True owner-private cross-service media:** exact Privacy signed grant, Studio plan, Jobs rendering+org/quota/storage, protected owner MP4/SRT, Spatial Replay, auth-bound revocation/deletion/late write/signed URL validity, professional RuAi boundaries and Admin controls require independent current source, CI and authenticated runtime proof. Synthetic fixtures ≠ real signed private user lifecycle.
7. **Full actual UI and device/production:** nine-state Spatial journey, keyboard/touch, reduced-motion, haptic/blind/captions, 20+ locales, Windows/iOS/Android/XR, AAA+++ asset quality and separate independent founder production GO. **A staging PASS cannot certify production or real physical devices.**

## 5. Next Chalk exact execution priorities

**Primary engineering goal now shifts from the *captured branch-head historical source-byte inventory* to authentic source-current execution and effective provider readback.** Do not spend cycles rehashing the already verified 826 original Git objects. Read master Labs #262 estate `00_START_HERE.md`, `WORKER_PROTOCOL.md`, `EVIDENCE_STANDARD.md`, `CROSS_SYSTEM_LEDGER.md` and Staging chapters 16–24; start at the new R892 successor chapter24. Use machine [complete 826-byte index](manifests/R892_COMPLETE_826_HISTORICAL_BLOB_BYTE_PROOF_20261108.json) and [corrected 180 tree mapping](manifests/R891_CORRECTED_180_GIT_TREES_INDEX_20261108.json).

On an approved *no new paid compute* isolated machine with GitHub/npm DNS, Node22/Java21 and no cloud credentials/production user media, verify current exact original R887 #180 source SHA (freshly read PR head) and clean checkout. Run all original native/core/firestore/storage/emulator commands from [R890 next-worker chapter18](18_R890_START_NEXT_CHALK_EXACT_HANDOFF_20261108.md). Save source/lock/tree, native TAP+exit, emulator project/residue, stdout/stderr hashes and authentic CI logs. Then restore legitimate required hosted CI and nonauthor review; read only authorized current Firebase Hosting channels/live releases/versions plus effective Rules/IAM/Functions/Storage/billing; compare actual deployed source version with source ledger, resolve Communications pin and shared Rules owner, require independently approved staging rollout/smoke/rehearsed rollback. Only after source+live acceptance verify private consent→render→Replay→revocation/deletion plus actual real devices/AAA+++ visuals. Production GO separate.

## 6. Explicit no-action and limits

R892 executed **only** authorized read-only GitHub original source object fetches and GitHub documentation writes on its own draft branch. No source merge, staging/production deploy, GitHub Actions dispatch or re-run, paid compute, billing/IAM/Rules/secret mutation, authenticated private user media retrieval, Twilio/SendGrid send, or live Firebase/GCP provider mutation. The complete 826-object finding is **for an archived 180-head snapshot only** and no all-history or cloud/resource-wide completeness claim is made.
