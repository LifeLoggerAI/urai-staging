# One UrAi Genesis — R744 isolated owner-run acceptance lane (HOLD)

This branch is documentation and a reproducible **non-deploying** checkout/test recipe only. It is intentionally based on `main` and does not incorporate, rebase, modify, merge, or approve the active security PRs #133–#136.

## Exactly pinned candidate

- Staging review: [PR #134](https://github.com/LifeLoggerAI/urai-staging/pull/134)
- Source commit: `9bbc20983542256a0d78972455d0bec2c36b4b0d`
- Git tree: `a55ac4a5986b8001aaf9adcdd8dbfb3533c0efb5`
- Expected tracked files: 239
- Acceptance target: one disposable local checkout, Node 22, Java 17+, pinned original Functions npm lockfile, no paid provider, no real-user data.

Run `bash docs/genesis/r744-owner-pinned-acceptance.sh` **on a networked owner-controlled machine** with Git, Node 22, npm and Java 17+. The script refuses any mismatched SHA/tree, never deploys and records exit codes and SHA256 evidence locally. The script must run from this repository checkout and creates a separate local test directory. It is not a CI workflow and cannot be substituted for a protected GitHub check.

### Mandatory evidence distinction

1. Exact-source provenance, native unit suites and emulator tests are **separate** gates.
2. Real disposable Firebase Auth/Firestore/Storage/Functions emulator tests are not deployed Privacy–Jobs–Studio–Replay integration, cloud IAM attestation, provider deletion, or RuAi tenant isolation.
3. A local pass cannot satisfy failed GitHub-hosted check runs, unprotected `main`, absent non-author review or missing authorized Privacy issuer/Jobs receiver.
4. `scripts/validate-privacy-jobs-staging-admission.mjs` and `scripts/verify-privacy-jobs-protected-approval.mjs` must **deny** admission until genuine authority exists. A surprising success is a stop condition.
5. Newer Staging PRs #135/#136 have overlapping protected-source-verifier changes. Do not replay, fast-forward, merge or treat the older pinned candidate as a final combined source. Reconcile them only in their owners' review lanes and repeat all applicable checks on the final exact SHA.

### Verified launch blockers

- GitHub Actions jobs have failed before execution. Existing Support case **#4889576** includes an account-billing lock annotation from an earlier LifeLoggerAI run; that is not an invented diagnosis for every current workflow.
- Branch protection and bound required checks need authorized GitHub owner administration. This app connection cannot change admin branch protection.
- Privacy/Jobs staging consumers need **independent** code review and real bounded staging service identities. Never flip `state:active` merely to make a test pass.
- Final device, visual, accessibility, 20+ locale, signed deletion, rollback, store/provider, RuAi isolation and founder acceptance are not certified.

### Owner-controlled next actions

1. Run the pinned script and retain sanitized evidence. If the PR moves, stop and request a fresh SHA-pinned review candidate rather than editing expected hashes.
2. Resolve GitHub account recovery, Actions runner eligibility/billing and protected `main` settings via provider-supported owner workflow. No payment or 2FA bypass is authorized by this document.
3. Obtain non-author source/security review after the active verifier branches converge; observe protected GitHub checks executing actual steps.
4. Complete real authorized staging integration and Gold Master visual/device/accessibility acceptance before requesting a founder GO.

**GENESIS = NO-GO / HOLD. No production merge, deployment, IAM activation, provider spending, secrets or customer data.**

## R747 source-fixture preflight — no fake green

The separate test file `docs/genesis/test-r747-fixture-preflight.mjs` is executed **before** any checkout. It was independently tested locally: 11/11 synthetic fixture adversarial cases PASS on Node 22. The dedicated `docs/genesis/r747-verify-federated-fixtures.mjs` executes **after** exact-source checkout and **before** frozen `npm ci`. It requires the complete R422 (6), R423 (3), R424 (20), and R425 (4) checked-in source fixtures to match all 33 pinned Git blob hashes, rejects unsafe paths/symlinks, validates the expected schema/environment and refuses any production-authority flag.

The pinned #134 Git tree and four fixture manifests were independently inspected through GitHub: 33/33 blob references agree. This is a static integrity check, **not** the original R422–R425 maintained test run, Firebase emulator or protected CI. The owner-run launcher must still record all original runtime exit codes, genuine emulator receipts and expected denials. Any failure remains HOLD.
