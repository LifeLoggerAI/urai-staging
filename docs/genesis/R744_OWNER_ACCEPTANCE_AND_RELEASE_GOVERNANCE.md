# One UrAi Genesis — R744 isolated owner-run acceptance lane (HOLD)

This remains a documentation and **non-deploying** owner-run checkout/test lane descended from the R744 isolated `main` acceptance branch. It does not merge, rebase, modify, or approve existing security/owner PRs. The pinned target is review-only R752 child #143: protected-source security (#138), R744 timing-test repair (#140), their R750 convergence (#141), and the recovered R745 historical ledger correction. All remain unmerged; this is neither a production candidate nor an approved release.

## Exactly pinned candidate

- Staging review: [PR #143](https://github.com/LifeLoggerAI/urai-staging/pull/143) (R752 source-only convergence, draft / unmerged)
- Source commit: `34643afb814ff9b4fe926d6d1866dcf4b311e579`
- Git tree: `98c24b1d31bb1250c1bef644b476a23cdc408426`
- Expected tracked files: 239
- Acceptance target: one disposable local checkout, Node 22, Java 17+, pinned original Functions npm lockfile, no paid provider, no real-user data.

Run `bash docs/genesis/r744-owner-pinned-acceptance.sh` **on a networked owner-controlled machine** with Git, Node 22, npm and Java 17+. The script refuses any mismatched SHA/tree, never deploys and records exit codes and SHA256 evidence locally. The script must run from this repository checkout and creates a separate local test directory. It is not a CI workflow and cannot be substituted for a protected GitHub check.

### Mandatory evidence distinction

1. Exact-source provenance, native unit suites and emulator tests are **separate** gates.
2. Real disposable Firebase Auth/Firestore/Storage/Functions emulator tests are not deployed Privacy–Jobs–Studio–Replay integration, cloud IAM attestation, provider deletion, or RuAi tenant isolation.
3. A local pass cannot satisfy failed GitHub-hosted check runs, unprotected `main`, absent non-author review or missing authorized Privacy issuer/Jobs receiver.
4. `scripts/validate-privacy-jobs-staging-admission.mjs` and `scripts/verify-privacy-jobs-protected-approval.mjs` must **deny** admission until genuine authority exists. A surprising success is a stop condition.
5. Staging #134/#136 have overlapping verifier changes, reconciled on review-only child #138. Child #141 carries #140's stricter synthetic timing regressions without changing the verifier; child #143 restores the separately verified R745 historical ledger record. All remain unmerged. This pinned owner-run acceptance must run the original full-repository gates on #143's exact SHA; earlier #138/#140/#141 source-only results do not transfer. Do not merge or approve based on this script.

### Verified launch blockers

- GitHub Actions jobs have failed before execution. Existing Support case **#4889576** includes an account-billing lock annotation from an earlier LifeLoggerAI run; that is not an invented diagnosis for every current workflow.
- Branch protection and bound required checks need authorized GitHub owner administration. This app connection cannot change admin branch protection.
- Privacy/Jobs staging consumers need **independent** code review and real bounded staging service identities. Never flip `state:active` merely to make a test pass.
- Final device, visual, accessibility, 20+ locale, signed deletion, rollback, store/provider, RuAi isolation and founder acceptance are not certified.

### Owner-controlled next actions

1. Run the pinned script against Staging #143 and retain sanitized evidence. If the PR moves, stop and request a fresh SHA-pinned review candidate rather than editing expected hashes.
2. Resolve GitHub account recovery, Actions runner eligibility/billing and protected `main` settings via provider-supported owner workflow. No payment or 2FA bypass is authorized by this document.
3. Obtain non-author source/security review after the active verifier branches converge; observe protected GitHub checks executing actual steps.
4. Complete real authorized staging integration and Gold Master visual/device/accessibility acceptance before requesting a founder GO.

**GENESIS = NO-GO / HOLD. No production merge, deployment, IAM activation, provider spending, secrets or customer data.**
