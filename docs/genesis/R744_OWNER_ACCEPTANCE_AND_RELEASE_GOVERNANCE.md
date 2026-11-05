# One UrAi Genesis — R744 isolated owner-run acceptance lane (HOLD)

This remains a documentation and **non-deploying** owner-run checkout/test lane descended from the R744 isolated `main` acceptance branch. It does not merge, rebase, modify, or approve existing security/owner PRs. The pinned target is review-only R754 child #146: the converged R752 source (#143) plus the minimal ES2020 TypeScript compatibility correction. The upstream security, timing and historical-ledger corrections remain inherited unchanged. All remain unmerged; this is neither a production candidate nor an approved release.

## Exactly pinned candidate

- Staging review: [PR #146](https://github.com/LifeLoggerAI/urai-staging/pull/146) (R754 ES2020 source-only correction, draft / unmerged)
- Source commit: `b400b694482ac26bb88adebc8216ef198fe83e60`
- Git tree: `ed7beb947e5cfe9dff35e40d3791df0cbe353c5b`
- Expected tracked files: 239
- Acceptance target: one disposable local checkout, Node 22, Java 17+, pinned original Functions npm lockfile, no paid provider, no real-user data.

Run `bash docs/genesis/r744-owner-pinned-acceptance.sh` **on a networked owner-controlled machine** with Git, Node 22, npm and Java 17+. The script refuses any mismatched SHA/tree, never deploys and records exit codes and SHA256 evidence locally. The script must run from this repository checkout and creates a separate local test directory. It is not a CI workflow and cannot be substituted for a protected GitHub check.

### Mandatory evidence distinction

1. Exact-source provenance, native unit suites and emulator tests are **separate** gates.
2. Real disposable Firebase Auth/Firestore/Storage/Functions emulator tests are not deployed Privacy–Jobs–Studio–Replay integration, cloud IAM attestation, provider deletion, or RuAi tenant isolation.
3. A local pass cannot satisfy failed GitHub-hosted check runs, unprotected `main`, absent non-author review or missing authorized Privacy issuer/Jobs receiver.
4. `scripts/validate-privacy-jobs-staging-admission.mjs` and `scripts/verify-privacy-jobs-protected-approval.mjs` must **deny** admission until genuine authority exists. A surprising success is a stop condition.
5. Staging #134/#136 have overlapping verifier changes, reconciled on review-only child #138. Child #141 carries #140's stricter synthetic timing regressions without changing the verifier; child #143 restores the separately verified R745 historical ledger record. All remain unmerged. This pinned owner-run acceptance must run the original full-repository gates on #146's exact SHA; earlier #138/#140/#141/#143 source-only results do not transfer. Do not merge or approve based on this script.

### Verified launch blockers

- GitHub Actions jobs have failed before execution. Existing Support case **#4889576** includes an account-billing lock annotation from an earlier LifeLoggerAI run; that is not an invented diagnosis for every current workflow.
- Branch protection and bound required checks need authorized GitHub owner administration. This app connection cannot change admin branch protection.
- Privacy/Jobs staging consumers need **independent** code review and real bounded staging service identities. Never flip `state:active` merely to make a test pass.
- Final device, visual, accessibility, 20+ locale, signed deletion, rollback, store/provider, RuAi isolation and founder acceptance are not certified.

### R756 expanded native regression gate (REVIEW ONLY)

- Exact frozen Staging #146 Git tree: `ed7beb947e5cfe9dff35e40d3791df0cbe353c5b`, 239 files. Independently reconstructed from archived #143 and the one GitHub-verified #146 source change; `git write-tree` matched GitHub.
- On exact #146 tree, the 29 original native test entrypoints: **320/320 PASS**, zero failures/skips; source-only TAP SHA256 `fe8b22c5992614979da0fc955b5bf1593b8114f52f5e5fb9fc5ed5459a137d45`. Original `npm run check`: **201/201** Node source cases PASS across 13 suites, but complete check exit 2 with absent Firebase/Node packages. Previous `TS2550` is now absent; native source tests do not prove the full dependency-backed TypeScript build.
- The owner runner now pins a **30-entrypoint** inventory: 29 source-tested entrypoints plus `scripts/test-security-dependency-compatibility.mjs` (2 tests). After the original frozen Functions install, it requires **322/322** in the raw Node TAP report with zero fails/skips, or HOLD. Missing/untracked entrypoints also HOLD.
- Offline `npm --prefix functions ci` was attempted against the exact lockfile and failed `ENOTCACHED` on `zod-to-json-schema-3.25.2.tgz`; the full frozen build, dependency compatibility, Firebase emulators and hosted CI have **not** passed. Do not inherit source-only green into release authority.

### Owner-controlled next actions

1. Run the pinned script against Staging #146 and retain sanitized evidence. If the PR moves, stop and request a fresh SHA-pinned review candidate rather than editing expected hashes.
2. Resolve GitHub account recovery, Actions runner eligibility/billing and protected `main` settings via provider-supported owner workflow. No payment or 2FA bypass is authorized by this document.
3. Obtain non-author source/security review after the active verifier branches converge; observe protected GitHub checks executing actual steps.
4. Complete real authorized staging integration and Gold Master visual/device/accessibility acceptance before requesting a founder GO.

**GENESIS = NO-GO / HOLD. No production merge, deployment, IAM activation, provider spending, secrets or customer data.**
