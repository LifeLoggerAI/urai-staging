# Staging authority reconciliation

- Repository: `LifeLoggerAI/urai-staging`
- Current-main base: `e789f57d0428c200cb131327cfce963c9ef34792`
- Source authority branch: `fix/environment-authority-20260706`
- Source authority head: `9568e09ad536f0fd936b316a5f4deb84fe1ff70d`
- Final reconciled source before this receipt update: `60fc659695b4ba45c32b60bc89ae721bf3fd7c3f`
- Reconciliation mode: complete source authority convergence
- Deployment performed: false
- Credential mutation: false
- Provider or billing action: false
- Production mutation: false

The non-overlapping staging authority files and all four overlapping control paths were reconciled onto current main authority:

- `.github/workflows/staging-deploy.yml`
- `.github/workflows/urai-production-verify.yml`
- `scripts/check-deploy-readiness.mjs`
- `scripts/urai-staging-lock.sh`

The result preserves exact-current-main identity, immutable action pins, a distinct ancestor rollback SHA, credential-free verification, source-bound prebuilt artifact verification, protected `staging` environment authority, runner-temporary credential confinement and destruction, exact pre-existing Hosting site checks, mutation receipt binding, and a separate credential-free public verification phase.

## Exact-head evidence

On exact head `60fc659695b4ba45c32b60bc89ae721bf3fd7c3f`:

- CI run `29372084164`: success.
- URAI Production Verify run `29372084104`: success.
- Artifact `8326487577`, digest `sha256:16d0d49e1014ef47e0772e44a58ca147fe8e93a1e2fdb773f7a495693ffab292`.
- Bootstrap status: passed.
- Launch score: 100/100.
- Commands: 12/12 passed, zero failed, zero skipped.

This receipt certifies source and emulator authority only. Independent review, merge to `main`, protected staging credentials/environment approval, real Firebase apply, public verification, recovery, and rollback proof remain required before any live staging claim.
