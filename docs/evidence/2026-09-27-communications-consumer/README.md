# Communications consumer convergence receipt

Staging source parent936a79e937b9feccbf48ba47b071faad9ae717dd. Communications PR58 current head17e14efa97f40e18ad67aaec03ec4c37512a3507 replaces stale pina147fe6a67d870b3e49e70dae56e938017a3ccd4. The consumer configuration changes only that SHA; structural equality was checked after substituting the old pin. Spatial remains pinned to current PR1296 head1b14dcbd9ce3a811e4d117921cbd8a00c7c42e66.

The Communications delta has76 commits. Targeted compatibility inspection covered the protected four-function workflow and changed provider-facing index/authentication boundary. Provider endpoints now reject revoked bearer tokens and require tenant membership plus owner/admin role. The added AI lane is not in the four-function deployment allowlist. No authority is added for AI, production deployment, LIVE billing or unrestricted messaging.

All five local authority/workflow/confinement checks pass. Public Spatial ref validation passes. Private Communications head was read through the connector and all three current-head CI/Production Verify/Visual Proof workflows pass. The protected controller's separate private-ref verification still must run in its authorized environment; this connector read does not replace that gate.

Unchanged restrictions: synthetic data; urai-staging only; four explicit functions; trial verified recipient only; WIF; mandatory rollback to delivery disabled. No workflow dispatch, provider call, send, spend, deployment or credential mutation performed. Fresh Staging CI, protected provider execution and independent review remain pending.
