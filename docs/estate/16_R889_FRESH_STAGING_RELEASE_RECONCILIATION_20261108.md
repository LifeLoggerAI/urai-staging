# ONE URAI GENESIS — R889 Staging release-pipeline reconciliation and exact handoff

**Observation:** 2026-11-08 Central / 2026-11-09 UTC. **Scope:** read-only GitHub, selected original Google Drive evidence, existing Genesis documentation, source-level assertions, CI metadata and local runner availability. **Disposition: STAGING LIVE HOLD / PRODUCTION NO-GO / PHYSICAL DEVICES UNVERIFIED.** This document is a review-only continuation of Staging R888 #181 and does not replace or merge engineering PRs.

## 0. Read in order; preserve the actual source lanes

- Master private Genesis registry Labs #262: docs/estate/00_START_HERE.md, WORKER_PROTOCOL.md, EVIDENCE_STANDARD.md, CROSS_SYSTEM_LEDGER.md, WORKER_INBOX.md. Staging-specific master intake Labs #279 and #280 are still draft review records.
- Staging history: starter #177 -> original forensic #178 -> original full branch/byte/CI continuation #179 -> next-worker handoff #181. Existing original Staging source donors #174 (real three-emulator callable), #175 (Life Graph 128 capacity), #176 (R840 convergence), #180 (R887 release workflow enrollment) are independent open draft branches. Do not merge documentation branch into source branch or assume donor acceptance transfers.
- Existing Staging knowledge chapters 01-13, branch-trees/INDEX.json and R840_CORE_SHA256.json remain canonical original evidence records. This R889 adds refreshed observations only.

## 1. Exact source-to-build ledger (fresh GitHub tree and file readbacks)

| Identity | Immutable commit | Files / declared Git blob bytes | Evidence status |
|---|---|---|---|
| Staging main | bda659ad23590b39e7f32de349f8a3723455ce02 | 147 / 1,054,519; recursive tree 164 entries, untruncated | Existing default branch; not latest converged release code |
| R840 implementation #176 | 49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b | 244 / 1,715,705, untruncated | 213 commits ahead of main; true combined 23-check suite has no fresh native/CI passing receipt |
| R887 workflow gate #180 | 0d9cdd67ef75071ee69a7fde1e168a1d0a263139 | 247 / 1,726,287, untruncated | Two commits ahead of R840, six changed files; three workflows + new source test + two documentation receipts; not merged |
| R888 documentation #181 | 689817d9f0f45e012a8174f5b40e115107b73a82 | 179 / 4,478,634, untruncated | Separate docs-only lane stacked on #179; does NOT incorporate R887 implementation |

Declared bytes above are Git tree metadata, NOT all original file bytes retrieved. Previous R884 original source-hash evidence independently verified only 11/244 R840 release-critical files (418,238 retrieved bytes). Previous original 180 branch-head tree snapshots recorded 28,540 path occurrences, 826 unique blob objects, 299 unique paths, 201,390,308 repeated referenced bytes, zero tree truncations. This continuation enumerated 182 branch names *before creating this R889 branch*, compared with earlier 179-name BRANCH_REFS.json: new names docs/chalk-r888-staging-next-worker-handoff-20261107, docs/chalk-staging-historical-artifact-and-byte-proof-20261107 and review/chalk-r887-r840-complete-bootstrap-emulator-gates-20261107; no formerly recorded names missing. New/current branch SHA/byte history for all 182 was NOT independently re-traversed. This review branch adds another branch head. Deleted refs, tags, unreachable objects, LFS binary bytes, historical artifacts and private external media remain outside full coverage.

## 2. Build/CI/test evidence; source inspection is not native testing

- Main Functions: Node22; functions/package-lock.json blob e390455942c13d61399af64328edd84878acbb39; firebase-tools manifest ^13.35.1 resolves 13.35.1; firebase-admin 12.7.0 and firebase-functions 4.9.0 locked. R840 and R887 use same Functions manifest blob 94b1a58084bb79892a37290c1a53f181b2e1568b, same lock blob d04e6bc1daaf49a0a4dd8102c93caff37dbf0f76, firebase-tools 15.32.1, firebase-admin 14.5.0, firebase-functions 7.4.0, vitest 4.1.11. For all three inspected refs, lockfileVersion=3, root manifest dependency and devDependency declarations exactly equal root lock entries, and Node engines equal 22. This is declaration consistency, not frozen install or module integrity/runtime proof.
- Governed staging-deploy.yml sets FIREBASE_CLI_VERSION=15.23.0, which differs from R840/R887 installed Functions dependency 15.32.1; actual command compatibility and source-to-prebuilt toolchain receipt remain NOT RUN.
- GitHub compare R840...R887: ahead 2, behind 0; additions in the three workflows 9+3+9 lines. New original R887 test source blob 0c46ede422700bc779a7dc60d4467bb863d5162c. This continuation fetched all three exact R887 workflow source blobs and independently performed **three limited source-string/order checks**: each gate appears exactly once, in the order test-r887 -> test:r816:capacity -> test:synthetic-lifecycle:http-emulator, and in the deploy workflow they precede prebuilt sealing and cloud authentication. 3/3 structural checks PASS. **No original Node self-test, npm ci/build, 23/23 Firebase Auth/Firestore/Storage callable test, genuine four-emulator Functions test, cloud smoke or device test was run in R889.**
- Present container: Node v22.16.0, npm 10.9.2, Java 21.0.12.1, Git 2.47.3. Git ls-remote failed because this container cannot resolve github.com, so it cannot obtain a full frozen dependency checkout. No substitute or invented native PASS.
- R887 exact PR head Actions: CI run 42447439250, verify 42447439206 both failure, jobs have **no reported steps**; scoped other workflows skipped. R888 documentation head: CI 42448829669 and verify 42448829714 also failure with no reported steps. R840 original CI 42335811356 and verify 42335811359 likewise failure before steps. The cause is not established by these job readbacks; owner GitHub support case #4889576 remains escalation.
- Historical Oct17 SHA 9f5f5bd2d80ddc01e303803e3d9f08a21be2ebd9: runs 39058851765 (CI), 39058851767 (cross-service) and 39058851791 (Verify) succeeded with actual executed steps. R884 independently verified four original GitHub-hosted ZIP digests. Their original 40/40 four-emulator synthetic, 16 isolated browser scenarios / 13 interactions, and source bootstrap are **historical** and not deployed staging/live private movie/device proof. Original R793 donor #174 archive passed all 15 member hashes and contained 322/322 native source suite, 5/5 Storage SDK, 21/21 real three-emulator callable synthetic tests; none transfers to the 23 expected R840/R887 head.

## 3. Fresh HIGH-priority consumer source-authority discrepancy

Staging main config/staging-consumers.json Git blob 29865030be7208eff6cc3bcfb47798cebd4600f5 has two active synthetic-only Communications consumers (Twilio trial and SendGrid signed callback). **Both** have sourceRef refs/heads/main and exactSha 759f664cdf00a48272f5401b7cfc45bbd8afb537. Direct GitHub read-only current Communications refs/heads/main is **40cd2f4b6d422734869486a49cddac9e103a58f1**; GitHub compare reports **22 commits ahead, zero behind**. This is a **current source-pin mismatch, NOT a deployed-service, data-leak or unauthorized-send finding.**

Important coupled source files: scripts/validate-staging-consumers.mjs hardcodes the older 759f... SHA, while scripts/verify-private-consumer-refs.mjs resolves the actual protected GitHub branch or read-only deploy-key ref and exits nonzero on a mismatched expected SHA. scripts/validate-active-consumer-refs.mjs explicitly defers protected consumers to the protected workflow. Current docs/estate/03_ARCHITECTURE_AND_CONNECTIONS.md describes Communications main 40cd... as config source pin even though the checked-in JSON remains 759f.... **Do not change only the JSON**: it would fail the hardcoded source authority contract. Have Communications and Staging owners decide current approved source, then review/update both pin+validator, scoped protected ref verification and synthetic-only provider boundaries on a distinct engineering branch; preserve stopped sending and opt-out protections.

## 4. Staging environments, provider/secret boundaries and live parity

- Exact main .firebaserc Git blob dc92cc63382c34e5bf1553f076b605ad44188fc7 maps default and staging to urai-staging, no production alias. firebase.json blob c903e045e8b51e534b995eb5f949a7ec8bb1e01f maps Hosting site urai-staging, public/ and four API function rewrites; Node22 Functions, Firestore rules/indexes and Storage rules; Functions/Firestore/Storage/Hosting loopback emulator ports are configured. Advanced R840 real callable suite uses disposable urai-staging-test and **three** emulators. Separate four-emulator acceptance is required.
- Source deploy lock requires exact current main, different ancestral rollback SHA, protected Actions context, explicit project, existing Hosting site, source-bound prebuilt, approved no-consumer-mutation assignments, production flag off, and WIF GitHub identity. Workflow's protected staging job/cloud IAM/environment protection must be independently authenticated before release; source statements do not prove the effective provider permission. Configuration names GCP_WIF_PROVIDER, GCP_STAGING_DEPLOY_SERVICE_ACCOUNT, GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT and limited URAI_CROSS_REPO_READ_TOKEN/SSH_KEY are references only; **no secret values inspected**.
- firebase.json publication scope includes Hosting/Functions/Firestore/Storage. A staging deploy must not assume cross-repository Rules ownership; open private Labs #261 tracks collisions with Spatial/RuAi/Admin. Source-first review must also prove there is no shared Functions namespace overwrite.
- Earlier Staging R885 (Nov7/8) public unauthenticated read-only observation: Hosting reserved init identified project urai-staging, but site /home error and permissive robots fingerprints aligned with older UrAi source, and /api/healthz and /api/buildinfo were HTTP404; actual Hosting version/deployer unknown. Fresh outside-in URLs could NOT be opened by this task's web fetch, so **these are dated historical observations, not a rechecked live status**. No private sample profile was inspected.
- Connected Drive R287/R286 owner historical provider record dated Nov1 reported project urai-staging / number 525778299248, 10 named Cloud Run services and 13 Gen1 plus 23 Gen2 API records (with overlaps), but is a **historical owner-authenticated provider snapshot**, not current effective IAM/Rules or the required source-bound live release receipt. Do not assert current Hosting or storage authority from it.
- Current GitHub main branch readback reports protected:false and accessible repository rulesets []; exact effective organization/enterprise/required protection and GitHub environment controls remain unverified. No human-independent approval or rollback drill was observed.

## 5. Current cross-service review heads (not integrated release certifications)

- Privacy #238 351268923365bbc7ffe4eebb4469fbb02b7a6195; Jobs #368 ebdf5f62338822f99b7293bdd5b9a0cda4917dd9 versus #369 e2f22162fe0ff03b4da3ba85cca4d466f31a704e (two diverged donor security lines); Studio #197 e974ce3254130e2fa5d1cf2d0fcebf13153e3261.
- Spatial release safety #2073 df19b28c9a75b5201d06ee859de89b3b3bebc967; RuAi B2Bportal #78 7f9f737ecd2fc5d7d3f7577e5b09c0f1fb7dcba5; Admin #113 22197620054dbaa20a60944466bbdc7ae319527b; Communications forensic #102 5820a07bf0cccbef9cce6ee32e87a34e0b1a3330; Labs Rules collision #261 2980ca804fe04c37256a00af6e291a79a05004e4. All were open/unmerged at the observed readback. Each source, owner/tenant/consent/denial/write-fence, provider project and source-to-runtime proof must be independently admitted before a whole-system staging/production claim.
- Legacy UrAi, UrAi-Dev and UrAiProd currently refuse source-declared deployment in previous exact-original 3/3 native refusal tests; does NOT identify or undo previous live Hosting release. Spatial owns current consumer production authority.

## 6. Exact next execution: approvals and stop conditions

**No-unapproved-cost isolated Node22/Java21 runner; no ADC, GCP/Firebase token, private user files or real production data; first refresh the #180 SHA and repeat source checks:**

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

Capture exact commit, Git tree, lock blob, installed versions, command exit code, TAP/stdout hashes, emulator project, selected test names/coverage, and failed/missing steps. The callable HTTP harness is **three** emulators; run source-pinned separate genuine four-emulator proof later after explicit review. A correct fail-closed privacy/Jobs admission denial is not proof of the positive private movie lifecycle. Do not generate false grants or enroll owner identities to get green output.

Then obtain independent review and protected CI admission; reconcile Communications source pins and upstream governance; perform read-only authorized Firebase Hosting live release/version + effective Rules/Functions/IAM readback; compare deployed SHA and robots/buildinfo; only with separate owner approval consider staging deployment/smoke/rollback. Independently verify consent -> Privacy -> Studio -> Jobs -> protected MP4/SRT -> Spatial Replay -> revocation/deletion/late-write denials and physical Windows/mobile/XR/accessibility/AAA+++ visuals. **Production GO requires a separate decision; a Staging PASS is never production or physical-device certification.**

## 7. Explicit actions NOT taken in R889

No production or staging deploy, workflow dispatch, repo merge, branch force-push, Firebase/GCP provider authentication, IAM or Rules mutation, billing change, paid compute, secret disclosure, private media inspection, provider send or runtime positive consent issuance. GitHub documentation here is added only on a new draft-review branch stacked on existing Staging #181; prior #174/#175/#176/#180 implementation and historical artifacts remain untouched.
