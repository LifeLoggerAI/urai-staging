# One UrAi Genesis — R744 isolated owner-run acceptance lane (HOLD)

This remains a documentation and **non-deploying** owner-run checkout/test lane descended from the R744 isolated `main` acceptance branch. It does not merge, rebase, modify, or approve existing security/owner PRs. The pinned target is review-only R755 child #148: the R754 ES2020 correction (#146) plus synthetic memory owner/graph consistency fences. These remain source review candidates, not releases. The upstream security, timing and historical-ledger corrections remain inherited unchanged. All remain unmerged; this is neither a production candidate nor an approved release.

## Exactly pinned candidate

- Staging review: [PR #148](https://github.com/LifeLoggerAI/urai-staging/pull/148) (R755 memory owner/graph consistency correction, draft / unmerged)
- Source commit: `09c08cc2c9d5e4f987b7051664ba2a0e45333646`
- Git tree: `0688f4fbde627b03424d55b94f921307a119c7f4`
- Expected tracked files: 239
- Acceptance target: one disposable local checkout, Node 22, Java 17+, pinned original Functions npm lockfile, no paid provider, no real-user data.

Run `bash docs/genesis/r744-owner-pinned-acceptance.sh` **on a networked owner-controlled machine** with Git, Node 22, npm and Java 17+. The script refuses any mismatched SHA/tree, never deploys and records exit codes and SHA256 evidence locally. The script must run from this repository checkout and creates a separate local test directory. It is not a CI workflow and cannot be substituted for a protected GitHub check.

### Mandatory evidence distinction

1. Exact-source provenance, native unit suites and emulator tests are **separate** gates.
2. Real disposable Firebase Auth/Firestore/Storage/Functions emulator tests are not deployed Privacy–Jobs–Studio–Replay integration, cloud IAM attestation, provider deletion, or RuAi tenant isolation.
3. A local pass cannot satisfy failed GitHub-hosted check runs, unprotected `main`, absent non-author review or missing authorized Privacy issuer/Jobs receiver.
4. `scripts/validate-privacy-jobs-staging-admission.mjs` and `scripts/verify-privacy-jobs-protected-approval.mjs` must **deny** admission until genuine authority exists. A surprising success is a stop condition.
5. Staging #134/#136 have overlapping verifier changes, reconciled on review-only child #138. Child #141 carries #140's stricter synthetic timing regressions without changing the verifier; child #143 restores the separately verified R745 historical ledger record. All remain unmerged. This pinned owner-run acceptance must run the original full-repository gates on #148's exact SHA; earlier #138/#140/#141/#143/#146 source-only results do not transfer. Do not merge or approve based on this script.

### Verified launch blockers

- GitHub Actions jobs have failed before execution. Existing Support case **#4889576** includes an account-billing lock annotation from an earlier LifeLoggerAI run; that is not an invented diagnosis for every current workflow.
- Branch protection and bound required checks need authorized GitHub owner administration. This app connection cannot change admin branch protection.
- Privacy/Jobs staging consumers need **independent** code review and real bounded staging service identities. Never flip `state:active` merely to make a test pass.
- Final device, visual, accessibility, 20+ locale, signed deletion, rollback, store/provider, RuAi isolation and founder acceptance are not certified.

### R756 expanded native regression gate (REVIEW ONLY)

- Exact frozen Staging #148 Git tree: `0688f4fbde627b03424d55b94f921307a119c7f4`, 239 files. Reconstructed from the verified #146 tree and two exact GitHub-verified #148 source changes; `git write-tree` matched GitHub.
- On exact #148 tree, the 29 original native entrypoints: **320/320 PASS**, zero failures/skips, TAP SHA256 `f3f49b594065693328d99c32a9fa546db796e45937aa5efa25636f4bc990ec38`. Original `npm run check`: **201/201** Node source cases PASS across 13 suites, but overall exit 2 due to absent Firebase/Node packages. New synthetic-owner/graph emulator cases remain **NOT EXECUTED** on real Firebase; the previous `TS2550` is absent.
- The owner runner now pins a **30-entrypoint** inventory: 29 source-tested entrypoints plus `scripts/test-security-dependency-compatibility.mjs` (2 tests). After the original frozen Functions install, it requires **322/322** in the raw Node TAP report with zero fails/skips, or HOLD. Missing/untracked entrypoints also HOLD.
- Offline `npm --prefix functions ci` was attempted against the exact lockfile and failed `ENOTCACHED` on `zod-to-json-schema-3.25.2.tgz`; the full frozen build, dependency compatibility, Firebase emulators and hosted CI have **not** passed. Do not inherit source-only green into release authority.

### Owner-controlled next actions

1. Run the pinned script against Staging #148 and retain sanitized evidence. If the PR moves, stop and request a fresh SHA-pinned review candidate rather than editing expected hashes.
2. Resolve GitHub account recovery, Actions runner eligibility/billing and protected `main` settings via provider-supported owner workflow. No payment or 2FA bypass is authorized by this document.
3. Obtain non-author source/security review after the active verifier branches converge; observe protected GitHub checks executing actual steps.
4. Complete real authorized staging integration and Gold Master visual/device/accessibility acceptance before requesting a founder GO.

**GENESIS = NO-GO / HOLD. No production merge, deployment, IAM activation, provider spending, secrets or customer data.**
