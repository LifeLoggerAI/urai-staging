# 06 — Gaps, contradictions, priorities
**P0** GitHub `main` API `protected:false` despite protected-main release policy; owner must inspect actual branch rulesets, enforced checks and review.
**P0** GitHub Actions on R840 failed with **zero recorded steps** and inaccessible logs; obtain official runner/billing/admission explanation rather than guessing a compiler problem. Re-run only after owner-authorized availability.
**P0** Current exact combined R840 source has no fresh frozen `npm ci`, full original suite, 23/23 actual three-emulator callable and independently successful four-emulator (previous IPC Unix socket `EPERM`). Donor results cannot transfer.
**P0** Staging WIF/IAM, account billing, pre-existing Hosting site, deployed source SHA, effective Firestore/Storage Rules, Functions namespace and current HTTP health not verified. Older Sep24 503 observation cannot be called today's HTTP status.
**P0** Recovery/rollback and monitoring absent in `URAI_STAGING_DEFINITION_OF_DONE.md`; protected approval/actual main build and private media end-to-end required.
**P1** `ENVIRONMENT.md` says Node20; `package.json`, `functions/package.json`, `firebase.json`, CI use Node22. Older doc historical. Deploy workflow pins Firebase CLI15.23.0 while Functions lock resolves 15.32.1; compatibility unproven.
**P1** June `docs/URAI_GENESIS_STAGING_READINESS.md` calls legacy `LifeLoggerAI/UrAi` product source. Current `CROSS_REPO_RELEASE_MAP.md` correctly identifies Spatial and quarantines UrAi.
**P1** README and `TEST_REPORT.md` mention public staging write smoke; current `scripts/smoke-staging.sh` is receipt-bound **nonmutating** negatives, so old examples are not approval to write emails/events to staging.
**P1** `ci.yml` Workstream C and Chromium jobs are narrowly filtered to old branch/PR109, not advanced PR176. Production verify workflow name does not imply real production verified.
**P1** `config/staging-consumers.json` pins Communications main; must revalidate actual upstream SHA, least privilege and provider receipts; no provider mutation implied by config flags.
**Unverified**, not an incident claim: private-data exposure, billing suspension reason, live Firebase IAM/public endpoint protections, real production deployment and device behavior. **HOLD**.
