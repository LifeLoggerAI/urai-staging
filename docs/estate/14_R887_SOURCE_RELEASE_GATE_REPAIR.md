# R887 — Source-pinned release acceptance wiring repair (review only)

**Original source parent:** Staging PR #176 R840 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b`. **Branch:** `review/chalk-r887-r840-complete-bootstrap-emulator-gates-20261107`; **not merged or deployed**.

## Defect
The R840 original code introduced `npm run test:r816:capacity` (128-node transactional fence) and `npm --prefix functions run test:synthetic-lifecycle:http-emulator` (23 named real callable HTTP checks across disposable Auth/Firestore/Storage emulators). However, direct inspection of all 15 source workflow files found neither command enrolled in CI, URAI Production Verify, or protected Staging preflight. The root `npm run check` uses the R816 command, but those three paths invoke `urai-staging-bootstrap.mjs` or other narrower commands rather than `npm run check`. The immutable 15-command bootstrap inventory remains unchanged and therefore does not count these tests.

**Failure mode:** Green hosted source bootstrap or deploy preflight could be reported even though neither converged capacity and callable lifecycle suite had executed on the exact release head.

## Proposed isolated repair
1. CI adds a self-enforcing source-wiring regression and original R816/R840 commands following bootstrap, before artifact evidence upload.
2. URAI Production Verify adds the same checks before existing source-bound evidence verification. Workflow name does not certify production.
3. Staging Deploy Lock preflight runs the same checks in the **credential-free** job before sealing/downloading deployable prebuilt artifacts, keeping `run_live_deploy=false` by default, existing `main` and rollback SHA pins, and WIF identity scope unmodified.
4. New dependency-free `scripts/test-r887-release-acceptance-wiring.mjs` checks missing/duplicate/out-of-order commands on all three workflows, bounded project and emulator selectors, manual deploy/production-disabled state and sequencing before WIF acquisition. Native static checker rejects removed, repeated and reordered test commands.

**Tests/claims:** No newest-head frozen install, full original unit suite, 23/23 HTTP acceptance, genuine four-emulator acceptance or hosted required checks can be claimed from workflow edits alone. Local test execution requires exact complete source and original dependency installation; the current container has no GitHub/npm DNS and no frozen dependencies. GitHub Actions account/runner startup is currently blocked (zero step failures), and no paid compute, CI dispatch or deployment is authorized. A previous R793 21/21 real 3-emulator donor and R816 3/3 in-memory results remain historical; **re-run all modified R887 source tests** on exact new head once a permitted runner is available.

**Separate gates still HOLD:** four-emulator Functions integration, active Firebase Hosting version/deployer provenance and source-to-live parity (staging currently matches legacy UrAi error/robots), real owner consent issuer/Jobs/Studio/Replay private media, protection/independent reviewer, production and physical devices. Staging green is not automatic production/device certification.

**Review rules:** Preserve R840 #176, R884–R886 docs #179, Labs #280 and all earlier donors; this branch is only an additive proposal based on R840, not an overwrite. Independently review and converge before merging to `main`. No cloud credentials/permissions or user memory were accessed.

## Owner-approved zero-unapproved-cost verification
```bash
git checkout --detach <exact-reviewed-R887-head>
test -z "$(git status --porcelain --untracked-files=all)"
node --test scripts/test-r887-release-acceptance-wiring.mjs
npm --prefix functions ci --ignore-scripts --engine-strict --audit=false
npm run test:r816:capacity
npm --prefix functions run test:synthetic-lifecycle:http-emulator
```
Use Node22/Java21 with no Firebase ADC/GCP credentials; record actual source HEAD/tree SHA and original exit/output/TAP with SHA-256. The self-test is a source-level wiring assertion, not a substitution for executing original network/emulator acceptance.
