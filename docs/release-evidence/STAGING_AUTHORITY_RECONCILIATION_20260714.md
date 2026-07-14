# Staging authority reconciliation

- Repository: LifeLoggerAI/urai-staging
- Current-main base: e789f57d0428c200cb131327cfce963c9ef34792
- Source authority branch: fix/environment-authority-20260706
- Source authority head: 9568e09ad536f0fd936b316a5f4deb84fe1ff70d
- Trigger SHA: 6677b9571ca81ccaa03fb44d3b346bf8a5cc45b7
- Reconciliation mode: partial
- Deployment performed: false
- Credential mutation: false
- Production mutation: false

The clean, non-overlapping staging authority files were transferred onto current main.

When reconciliation mode is partial, current-main authority was deliberately retained for these four overlapping controls pending focused review:

- .github/workflows/staging-deploy.yml
- .github/workflows/urai-production-verify.yml
- scripts/check-deploy-readiness.mjs
- scripts/urai-staging-lock.sh

This receipt does not claim those four paths are reconciled. Exact-head validation, focused path reconciliation and independent review remain required before any protected staging operation.
