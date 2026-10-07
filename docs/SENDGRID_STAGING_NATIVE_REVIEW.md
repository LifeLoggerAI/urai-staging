# SendGrid staging independent review prerequisite

PR #109 is the proposed combined staging verification controller. Its owned branch is
`repair/staging-provider-harness-converged-20261007`, targeting the unchanged #106
branch `governance/sendgrid-current-review-20261006`. Main, #106, and canonical
`config/staging-consumers.json` retain Communications
`759f664cdf00a48272f5401b7cfc45bbd8afb537`. Predecessor approvals do not transfer.

This draft offers two source-controlled verification profiles: `canonical-main`
checks that retained main759 pin; `working-pr84` checks unmerged Communications
#84 at `274f53573f4d3bf843047e285f080083a55fe1ab`, on
`codex/communications-component-integration-20261007`. Neither profile changes
canonical consumers or admits arbitrary repository/branch/SHA inputs. This is
scoped proposed staging verification, not main adoption or runtime acceptance.

Before protected SendGrid or Twilio execution, the actual `$GITHUB_SHA` must equal
the unchanged open, non-draft PR #109 head on its declared branch and base, with:

- current native GitHub APPROVED decision by LimberNutz0 on that SHA;
- independent human reviewer, distinct from the PR author, with disclosed prior implementation/conflicts;
- verified GitHub repository permission of write, maintain or admin for the governed native approval; null, inaccessible or lesser permission blocks execution without widening access;
- no unresolved review threads;
- latest exact-head CI and URAI Production Verify SUCCESS.

The read-only preflight uses the workflow's own repository GITHUB_TOKEN, with contents/actions/pull-requests read permissions. The Communications read-only deploy key cannot substitute for native review metadata. Unavailable metadata blocks execution before WIF or provider/secret/deployment mutation. The preflight reads all review, review-thread and Actions pages and rechecks PR identity for movement. The selected Communications live branch is separately checked with the existing protected read token or read-only deploy key, then the exact SHA is checked out. Missing credentials or a moved ref fail closed. Native review and source refs are checked again before the provider round trip. Twilio keeps its existing synthetic/trial/function/secret/rollback limits and uses the actual current canonical consumer ID; its historical issue-comment path cannot bypass the owned branch review binding.

The sanitized receipt binds the executing controller SHA, workflow run, native review
PR/ID/reviewer/verified permission, selected source profile/PR/SHA, and the retained
canonical pin. It records `canonicalConsumerAdopted:false`. Callback verification
rejects predecessor run/controller/review/source records. A source change invalidates
native review and applicable checks; the branch's next actual head requires fresh
approval. The controller deliberately reads its actual native PR head rather than
embedding a circular self-referential commit SHA in source.

No approval is recorded by this document. No provider operation, spend, production deployment or external message is authorized by a preflight receipt. Human independence remains a real disclosure and judgment requirement.

STAGING_REVIEW_PR_NUMBER is explicitly 109. A new PR or merge commit must be reviewed at its own exact identity and the bound review target deliberately updated; a closed/predecessor review cannot silently authorize it. The current draft has no actual native independent approval or protected provider execution receipt.

