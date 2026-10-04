# SendGrid staging independent review prerequisite

PR #71 is the converged controller candidate. It preserves the provider/security lineage from #68, the generic WIF/runtime-identity repair from #70, and the Spatial #1577 exact-head consumer binding. Predecessor approvals do not transfer: review the unchanged current #71 head.

Before protected SendGrid execution, the exact executing Staging source must be the unchanged open, non-draft #71 head with:

- current native GitHub APPROVED decision by LimberNutz0 on that SHA;
- independent human reviewer, distinct from the PR author, with disclosed prior implementation/conflicts;
- verified GitHub repository permission of write, maintain or admin for the governed native approval; null, inaccessible or lesser permission blocks execution without widening access;
- no unresolved review threads;
- latest exact-head CI and URAI Production Verify SUCCESS.

The read-only preflight uses the workflow's own repository GITHUB_TOKEN, with contents/actions/pull-requests read permissions. The Communications read-only deploy key cannot substitute for native review metadata. Unavailable metadata blocks execution before WIF or provider/secret/deployment mutation. The preflight reads all review, review-thread and Actions pages and rechecks PR identity for movement.

This source control implements the same prerequisite documented in #58 for the #71 successor. No approval is recorded by this document. No provider operation, spend, production deployment or external message is authorized by a preflight receipt. Human independence remains a real disclosure and judgment requirement.

STAGING_REVIEW_PR_NUMBER is explicitly 71. A new PR or merge commit must be reviewed at its own exact identity and the bound review target deliberately updated; a closed/predecessor review cannot silently authorize it.
