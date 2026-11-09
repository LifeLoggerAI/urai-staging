# START NEXT CHALK — ONE URAI GENESIS STAGING R890 / successor R891

**Date:** November 8, 2026 Central / November 9 UTC. **Release posture: STAGING LIVE HOLD / PRODUCTION NO-GO / REAL DEVICES UNVERIFIED.** Treat this as the exact successor's navigation, not a signed release certificate.

## Do not repeat the work or erase the workers

This is the *Staging* lane of the ONE URAI GENESIS integration. It was built; this audit is about accepting/reconciling and certifying it, not inventing it. The consumer UrAi visual Spatial app, Privacy signed consent, Studio plan and MP4/SRT, Jobs rendering/storage, RuAi professional portal, and related cloud systems are owned by independent repositories. Never conflate their code, deployments or tests.

**Read sequentially (not selectively):**

1. Private canonical estate review [Labs #262](https://github.com/LifeLoggerAI/urai-labs-llc/pull/262): `docs/estate/00_START_HERE.md`, `WORKER_PROTOCOL.md`, `EVIDENCE_STANDARD.md`, `CROSS_SYSTEM_LEDGER.md`, `WORKER_INBOX.md`. Review-only registry; no production authority. Earlier private Staging intake [Labs #279](https://github.com/LifeLoggerAI/urai-labs-llc/pull/279), [#280](https://github.com/LifeLoggerAI/urai-labs-llc/pull/280).
2. Staging docs [#177](https://github.com/LifeLoggerAI/urai-staging/pull/177) → [#178](https://github.com/LifeLoggerAI/urai-staging/pull/178) → [#179](https://github.com/LifeLoggerAI/urai-staging/pull/179) → [#181](https://github.com/LifeLoggerAI/urai-staging/pull/181) → [#182](https://github.com/LifeLoggerAI/urai-staging/pull/182) → this R890 review branch. Read `docs/estate/00_START_HERE.md`, chapters 01–17, original `BRANCH_REFS.json`, `branch-trees/INDEX.json`, original `R840_CORE_SHA256.json`.
3. R890 definitive **current-tree byte ledger** `docs/estate/manifests/R890_R887_COMPLETE_BYTE_COVERAGE_INDEX_20261108.json` and its **16 original-blob SHA-256 evidence segments**, spanning `R890_R887_BYTES_000_016.json` to `R890_R887_BYTES_240_247.json`. **247/247 paths, 1,726,287/1,726,287 bytes, all SHA-256 hashed and size-matched** on immutable engineering PR #180 commit `0d9cdd67ef75071ee69a7fde1e168a1d0a263139`; no fetch failures. The complete current R887 release-source Git tree is byte-inventoried. **Do not interpret as all 2024–2026 history or cloud/CI/device acceptance.**
4. This audit's full architecture and evidence: [R890 chapter 17](17_R890_COMPLETE_CURRENT_SOURCE_BYTE_ARCHITECTURE_AND_RELEASE_GATES_20261108.md), previous [R889 chapter 16](16_R889_FRESH_STAGING_RELEASE_RECONCILIATION_20261108.md), and [R890 machine release gate matrix](manifests/R890_RELEASE_GATE_AND_CROSS_SYSTEM_CHECKPOINT_20261108.json) (15 independently tracked gates).
5. *Engineering is separate*: Storage SDK donor [#173](https://github.com/LifeLoggerAI/urai-staging/pull/173), 21/21 genuine three-emulator donor [#174](https://github.com/LifeLoggerAI/urai-staging/pull/174), 3/3 capacity adapter donor [#175](https://github.com/LifeLoggerAI/urai-staging/pull/175), converged R840 [#176](https://github.com/LifeLoggerAI/urai-staging/pull/176), R887 release-test enrollment [#180](https://github.com/LifeLoggerAI/urai-staging/pull/180). All are open draft/unmerged at latest observation. Preserve both donor histories, test enrollment, all prior worker branches and source authority. No merging a docs PR into runtime source by inference.

## Exact identity / state (refresh before acting)

| Role | SHA | Evidence |
|---|---|---|
| Staging main | `bda659ad23590b39e7f32de349f8a3723455ce02` | 147 tracked Git files / 1,054,519 declared bytes, not R887 and not proven live |
| R840 converge #176 | `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | 244 files / 1,715,705 declared bytes; 23-callable expected, not run |
| R887 test enrollment #180 | `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | 247 original bytes read+hashed, **no Node/native CI/emulator success** |
| Previous doc handoff #182 | `cb59f1c006636537becb3e8aaee1901e19911ed1` | R889 review, this branch stacked on it |
| Historic October source | `9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9` | Oct 17 genuine CI, cross-service, Verify success, stale |
| Live Firebase Hosting release | **UNKNOWN** | Project identity found by historical public read; exact active version/deployer/source/Rules unknown |

Original R884 180-branch head metadata sweep (28,540 entries, 826 unique blob object SHAs, no recursive tree truncation) is separate; R889 enumerated 182 current branch names before new docs branches. Do not assert all-branch complete bytes, tags, unreachable commits, deleted refs, historical LFS data or all source history.

## What's truly implemented in Staging code

Firebase project `urai-staging` (source aliases staging/default), Hosting site `urai-staging` static validation page with API rewrites, Node22 Firebase Functions, Firestore rules and indexes, Storage rules, Auth/Firestore/Storage/Functions/Hosting local emulator configs, CI and governed manual staging deploy lock with exact current-main, ancestor rollback SHA, OIDC/WIF, prebuilt source SHA and staged release receipts. Controlled source has synthetic-only owner/consent/128-node Life Graph, ancestor replay checks, refusal of revoked data and Storage cleanup. **Not** a real production private user-memory service.

Both active Communications consumer exact SHA bindings are **stale** relative to current Communications `main`: configured `759f664cdf00a48272f5401b7cfc45bbd8afb537`, observed `40cd2f4b6d422734869486a49cddac9e103a58f1` (22 commits ahead). `scripts/validate-staging-consumers.mjs` hardcodes older pin. Coordinate owner-reviewed new source authority; **update config and validator together**, then re-run original protected ref validation. No evidence of actual unauthorized deploy or send from this mismatch.

Past R885 outside-in public staging showed `/home` failure wording/robots aligned with old UrAi, API health/buildinfo 404 and reserved init project identity `urai-staging`. This is historical November 7/8 public source-vs-Hosting parity evidence; **no authenticated live Hosting release/version readback**, so never claim current deployed revision or overwrite arbitrary site. `main protected:false`, visible rulesets `[]`, detail API 403; effective required review/protection and WIF/ IAM/billing unknown.

## What passed and what emphatically DID NOT

**Passed at pinned evidence:** R890 exact current source byte retrieval+SHA256 **247/247**, declared byte coverage **1,726,287/1,726,287**, original SHA test vector; R889 structural gating check **3/3 YAML source assertions**; historical Oct17 CI+Verify+cross-service Actions with actual successful job steps, Oct17 original four-emulator synthetic 40/40, donor #174 three-emulator real 21/21 + original 322/322 and Storage SDK 5/5 (original ZIP digests verified by earlier R884); donor in-memory capacity 3/3.

**Not passed/current:** Original R887 Node wiring test; frozen `npm ci`, full current build/test; 23/23 original real callable R887; genuine current four-emulator Functions R451; protected GitHub Actions CI/Verify (current R887 run IDs 42447439250/42447439206 fail before job steps); Source→Hosting published SHA; current protected WIF/IAM/Rules/deployed Functions; live staging negative smoke or rollback; approved Privacy→Jobs→Studio protected MP4/SRT→Replay→revoke/delete; actual cross-org/owner security; founder AAA+++ visuals; physical Windows/iOS/Android/XR and accessibility; separate production owner GO. Historical R793 and Oct17 passing receipts are real **but source-stale**.

## ONE NEXT EXECUTION ORDER — no shortcuts

**Phase A, no-cost / credential-free:** Freshly verify exact #180 head is still R887 SHA and source branches remain open, obtain clean isolated Node22/Java21 approved runner without ADC/Firebase tokens or real user data. Run:
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
Save SHA+Git tree, lock digest, Node/Java/npm versions, every exit/test name, TAP, evidence SHA256, emulator project and logs. A suite missing dependencies is NOT RUN, not PASS. 23 tests are three emulators; four-emulator is separate and needs original source-bound R451 acceptance. No API identity forging to force a positive response. Re-run if any source changes.

**Phase B, approval/protection:** GitHub Actions startup/eligibility owner Support #4889576, exact-head hosted CI jobs with real executed steps, required branch protection/environment and independent nonauthor approval; no bypass or unapproved spend.

**Phase C, provider GET only:** approved read-only Firebase Hosting live channels/versions; compare publish time/source SHA/active artifact/site/robots/rewrites; effective IAM, service identities, Functions+Cloud Run revisions, Firestore/Storage Rules, Scheduler, billing/WIF, namespace collision and rollback source. Do not expose private user data or credentials.

**Phase D, owner-review engineering:** Communications exact current source pin, shared Rules publishers (Labs #261), original Jobs divergent #368/#369 security, Privacy/Studio consent/Jobs emitter and private output authority. Preserve denial gates.

**Phase E, separately authorized staging:** only approved exact main, recovery source, prebuilt seals, WIF and provider authority; original signed real mutation receipt, negative HTTP smoke, recovery and rollback. Never deploy from an audit document.

**Phase F, independent real integration and devices:** actual signed owner grant→private jobs/render→protected movie/SRT→Replay→cancel/revoke/delete/late writes; current Spatial nine-state journey and keyboard/accessibility; physical Windows/mobile/XR and literal AAA+++ visual approval. Production remains a separate owner release decision and **staging PASS never certifies production or physical devices**.

## Latest cross-worker pointers (refresh)

Spatial #2073, Privacy #238, Jobs #368/#369, Studio #197, B2Bportal #78, Admin #113, Communications #102, private Labs #261/#262. Full exact SHA ledger is [chapter 17](17_R890_COMPLETE_CURRENT_SOURCE_BYTE_ARCHITECTURE_AND_RELEASE_GATES_20261108.md) and machine matrix; don't trust remembered older SHAs.

## Safe completion and next worker receipt

The entire R890 exercise was review-only: **no GitHub Actions rerun/dispatch, no source merge, no Firebase or production deployment, no billing/IAM/Rules/Secrets change, no paid compute, no private user memory, no external provider messages.** GitHub CLI in the local container lacked DNS, so native checkout/npm original tests were not run. The new 16 Git blob SHA256 manifests are documentary evidence on an independent branch; all source implementation PRs remain unmodified. If any gate is unavailable, write **BLOCKED/UNKNOWN** with the exact prerequisite, not a fabricated success.

**Next Chalk's first durable action:** Refresh #180 and this PR heads, read all R890 files, authenticate no-cost clean native test custody, and reconcile provider read-only staging release. Preserve worker history and all tests; do not restart the inventory from zero.
