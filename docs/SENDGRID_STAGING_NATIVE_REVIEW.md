# SendGrid staging independent review prerequisite

PR #106 is the current SendGrid controller/review successor. It preserves the provider/security lineage already present on main and rebinds the protected SendGrid E2E to current Communications main `759f664cdf00a48272f5401b7cfc45bbd8afb537`. Predecessor approvals do not transfer.

Before protected SendGrid execution, the exact executing Staging source must be the unchanged open, non-draft PR #106 head with:

- current native GitHub APPROVED decision by LimberNutz0 on that SHA;
- independent human reviewer, distinct from the PR author, with disclosed prior implementation/conflicts;
- verified GitHub repository permission of write, maintain or admin for the governed native approval; null, inaccessible or lesser permission blocks execution without widening access;
- no unresolved review threads;
- latest exact-head CI and URAI Production Verify SUCCESS.

The read-only preflight uses the workflow's own repository GITHUB_TOKEN, with contents/actions/pull-requests read permissions. The Communications read-only deploy key cannot substitute for native review metadata. Unavailable metadata blocks execution before WIF or provider/secret/deployment mutation. The preflight reads all review, review-thread and Actions pages and rechecks PR identity for movement.

This source control preserves the existing native exact-head review prerequisite for the current PR #106 successor. No approval is recorded by this document. No provider operation, spend, production deployment or external message is authorized by a preflight receipt. Human independence remains a real disclosure and judgment requirement.

STAGING_REVIEW_PR_NUMBER is explicitly 106. A new PR or merge commit must be reviewed at its own exact identity and the bound review target deliberately updated; a closed/predecessor review cannot silently authorize it.
