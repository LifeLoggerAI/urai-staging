# One UrAi Genesis — R744 isolated owner-run acceptance lane (HOLD)

This remains a documentation and **non-deploying** owner-run checkout/test lane descended from the R744 isolated `main` acceptance branch. It does not merge, rebase, modify, or approve existing security/owner PRs. The pinned target is review-only R778 child #167 (built on #165, #164, #160, #158, #157, #156, #154, #151 and #148): ES2020 compatibility, synthetic-memory source/graph integrity, acyclic relationships, direct Replay source-chain validation before/after bytes, and strict TypeScript relation narrowing. These remain source review candidates, not releases. The upstream security, timing and historical-ledger corrections remain inherited unchanged. All remain unmerged; this is neither a production candidate nor an approved release.

## Exactly pinned candidate

- Staging review: [PR #167](https://github.com/LifeLoggerAI/urai-staging/pull/167) (R778 orphan synthetic Storage cleanup atop reviewed ancestry and bounded Firestore revocation, draft / unmerged)
- Source commit: `734919606a8b01bca21a7c265c2b0d18947ab36c`
- Git tree: `c19a43e1898782cb31275403e3f421ec752e8beb`
- Expected tracked files: 239
- Acceptance target: one disposable local checkout, Node 22, Java 17+, pinned original Functions npm lockfile, no paid provider, no real-user data.

Run `bash docs/genesis/r744-owner-pinned-acceptance.sh` **on a networked owner-controlled machine** with Git, Node 22, npm and Java 17+. The script refuses any mismatched SHA/tree, never deploys and records exit codes and SHA256 evidence locally. The script must run from this repository checkout and creates a separate local test directory. It is not a CI workflow and cannot be substituted for a protected GitHub check.

### Mandatory evidence distinction

1. Exact-source provenance, native unit suites and emulator tests are **separate** gates.
2. Real disposable Firebase Auth/Firestore/Storage/Functions emulator tests are not deployed Privacy–Jobs–Studio–Replay integration, cloud IAM attestation, provider deletion, or RuAi tenant isolation.
3. A local pass cannot satisfy failed GitHub-hosted check runs, unprotected `main`, absent non-author review or missing authorized Privacy issuer/Jobs receiver.
4. `scripts/validate-privacy-jobs-staging-admission.mjs` and `scripts/verify-privacy-jobs-protected-approval.mjs` must **deny** admission until genuine authority exists. A surprising success is a stop condition.
5. Staging #134/#136 have overlapping verifier changes, reconciled on review-only child #138. Child #141 carries #140's stricter synthetic timing regressions without changing the verifier; child #143 restores the separately verified R745 historical ledger record. All remain unmerged. This pinned owner-run acceptance must run the original full-repository gates on #167's exact SHA; earlier #138/#140/#141/#143/#146/#154/#156/#157 source-only results do not transfer. Do not merge or approve based on this script.

### Verified launch blockers

- GitHub Actions jobs have failed before execution. Existing Support case **#4889576** includes an account-billing lock annotation from an earlier LifeLoggerAI run; that is not an invented diagnosis for every current workflow.
- Branch protection and bound required checks need authorized GitHub owner administration. This app connection cannot change admin branch protection.
- Privacy/Jobs staging consumers need **independent** code review and real bounded staging service identities. Never flip `state:active` merely to make a test pass.
- Final device, visual, accessibility, 20+ locale, signed deletion, rollback, store/provider, RuAi isolation and founder acceptance are not certified.

### R779 current source pin (#167) — REVIEW ONLY, RELEASE HOLD

- New candidate [Staging #167](https://github.com/LifeLoggerAI/urai-staging/pull/167) exact head `734919606a8b01bca21a7c265c2b0d18947ab36c`, Git tree `c19a43e1898782cb31275403e3f421ec752e8beb`, 239 tracked blobs, zero gitlinks. Original source-security [#165](https://github.com/LifeLoggerAI/urai-staging/pull/165) is an immutable parent, not an independently certified release.
- #167 leaves #165's consent-bound full Replay ancestry checks and #164's 251+ Firestore batch revocation cleanup intact, and adds pre-upload consent/receipt validation, upload-error compensating deletion, and final owner-prefix synthetic Storage object enumeration to remove an orphan without a backing Firestore row before asserting cleanupComplete.
- The original four-service emulator script gained **actual disposable SDK assertions** for absent/forged consent residual bytes and a seeded orphan object, requiring that the 251-row cleanup also removes one untracked source. Firebase Storage object LIST is documented as implemented by the emulator, but the exact pinned SDK/CLI version and this complete test have **NOT** been executed here. No SDK/native suite pass may be inferred.
- The unchanged R744 owner-run acceptance still demands a frozen Functions `npm ci`, unchanged full `npm run check`, 30 tracked original native entrypoints and exactly `322/322` TAP, genuine four-emulator R451 receipt, expected fail-closed Privacy/Jobs release-authority denials, exact commit/tree/source match and `productionAuthorized=false`. The shell changes only three immutable references: PR head ref, source SHA, tree SHA; any moving source causes an abort.
- No full original install, TypeScript/Functions build, complete 322-case test, genuine Auth/Firestore/Storage/Functions suite, protected CI/independent review, signed Privacy→Jobs→Studio→Spatial/RuAi receipt, provider deletion ack or founder device/creative approval exists for this source. **RELEASE HOLD / NO GO.**

### R775 previous owner pin (#165) — HISTORICAL ONLY

- Earlier source [#165](https://github.com/LifeLoggerAI/urai-staging/pull/165) at `383c390c821e404b7dc24318647074ca2db2d288`, tree `c4c9815127ee8a821b3a4aeb2c03d13db6dac899` is preserved as the immediate security parent. Its local 21/21 source-derived in-memory model is **not** an original Firebase runtime test and cannot certify #167.
- Earlier #164/#160 dependency-independent test receipts are source-specific and cannot be transferred to #167. All corresponding protected, browser, multi-repo, provider and Founder gates remain open.

### R771 prior owner-run acceptance pin (#160, HISTORICAL ONLY)

- Earlier current pin [#160](https://github.com/LifeLoggerAI/urai-staging/pull/160) exact `1219d785d09f5303d1d4addc16c666777c428b60`, tree `69aef7074a56dc1d46408ea9147faba2d6378d5e` and 239 tracked files is retained for audit history only.
- The prior 27-case source-driven simulation and 320 original dependency-free Node PASS results belong exclusively to #160. None can certify #165 or the deployed Genesis ecosystem.

### R769 historical exact-source owner acceptance pin (#158, HISTORICAL ONLY)

- Target [#158](https://github.com/LifeLoggerAI/urai-staging/pull/158) at immutable commit `f01eb015276761947d59eb3970f3b753f5510426` and tree `8f22aba645848a39c7c3bba76be71a4996a8bbaf` (239 tracked files). This child adds a strict TypeScript narrowing correction to #157's direct linked-parent checks, preserving #156's acyclic graph guard and #154's relationship integrity.
- The owner-runner changes exactly **three source identity literals**: commit SHA, Git tree and `refs/pull/158/head`. It retains the unmodified 30-entrypoint **322-case** native suite requirement, unchanged original full `npm run check`, frozen Functions `npm ci`, actual four-emulator tests, strict 58-case receipt, expected negative authorization decisions, `productionAuthorized=false` and no deployment actions.
- Independent verification on #158's exact 239-file tree: original 29 dependency-independent Node entrypoints **320/320 PASS**; minimal strict ES2020 TS control-flow repro now compiles where #157 failed; source tree intact. Original complete check still fails on absent installed Firebase/Node types; this is **not** an installed semantic build or a pass of the dependency-bound remaining two tests.
- Historical #154 evidence immediately below is retained for provenance and is **not** a source pin or full-release certificate for #158. A different working, owner-authorized networked runner must execute this exact new candidate; protected GitHub CI, real staging Privacy/Jobs identities, independent review and founder approval are separately mandatory.

### R765 source-pinned owner acceptance against R763 #154 (REVIEW ONLY)

- New candidate #154 exact commit `15b035fe506d9548e57243fc57b6e8eab931b196`, source tree `f95afcb2d58841c00e00f347f1e62cd586c58607`, tracked files 239.
- Source #154 inherits #148 via #151 and hardens synthetic graph source fixity, bounded enumeration and parent-link integrity. Existing R761 evidence below is historical for #148, **not** proof of the current #154 source.
- The owner-run script changes exactly its source commit, Git tree and PR ref. Its frozen install, native 322-case gate, exact four-Firebase-emulator checks, expected denial contracts and `productionAuthorized=false` are unchanged.
- **NOT AUTHORIZED:** These source-pin adjustments do not certify the dependency-installed Functions build, actual Firebase emulator execution, GitHub Actions, independent security review or launch acceptance. Keep HOLD.

### R756 expanded native regression gate (REVIEW ONLY)

- Exact frozen Staging #148 Git tree: `0688f4fbde627b03424d55b94f921307a119c7f4`, 239 files. Reconstructed from the verified #146 tree and two exact GitHub-verified #148 source changes; `git write-tree` matched GitHub.
- On exact #148 tree, the 29 original native entrypoints: **320/320 PASS**, zero failures/skips, TAP SHA256 `f3f49b594065693328d99c32a9fa546db796e45937aa5efa25636f4bc990ec38`. Original `npm run check`: **201/201** Node source cases PASS across 13 suites, but overall exit 2 due to absent Firebase/Node packages. New synthetic-owner/graph emulator cases remain **NOT EXECUTED** on real Firebase; the previous `TS2550` is absent.
- The owner runner now pins a **30-entrypoint** inventory: 29 source-tested entrypoints plus `scripts/test-security-dependency-compatibility.mjs` (2 tests). After the original frozen Functions install, it requires **322/322** in the raw Node TAP report with zero fails/skips, or HOLD. Missing/untracked entrypoints also HOLD.
- Offline `npm --prefix functions ci` was attempted against the exact lockfile and failed `ENOTCACHED` on `zod-to-json-schema-3.25.2.tgz`; the full frozen build, dependency compatibility, Firebase emulators and hosted CI have **not** passed. Do not inherit source-only green into release authority.

### Owner-controlled next actions

1. Run the pinned script against Staging #167 and retain sanitized evidence. If the PR moves, stop and request a fresh SHA-pinned review candidate rather than editing expected hashes.
2. Resolve GitHub account recovery, Actions runner eligibility/billing and protected `main` settings via provider-supported owner workflow. No payment or 2FA bypass is authorized by this document.
3. Obtain non-author source/security review after the active verifier branches converge; observe protected GitHub checks executing actual steps.
4. Complete real authorized staging integration and Gold Master visual/device/accessibility acceptance before requesting a founder GO.

**GENESIS = NO-GO / HOLD. No production merge, deployment, IAM activation, provider spending, secrets or customer data.**
