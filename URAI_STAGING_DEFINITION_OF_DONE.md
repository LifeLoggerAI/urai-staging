# URAI Staging Definition of Done

`urai-staging` may be called complete only when every required checkbox below is true.

## Repository and config

- [x] Canonical staging app path is documented as `LifeLoggerAI/urai-staging`.
- [x] `.firebaserc` maps `default` and `staging` to `urai-staging` and defines no production alias.
- [x] Production remains separated and is not selectable or deployable by staging scripts.
- [x] `firebase.json` includes Hosting, Functions, Firestore rules, Firestore indexes, and Storage rules.
- [x] `package.json` routes `deploy:staging` through `lock:staging`.
- [x] `.env.example` lists required names without secret values or a production project selector.

## Local and confined validation

- [x] `npm --prefix functions ci` succeeds on the exact candidate head.
- [x] `npm run check:deploy` succeeds on the exact candidate head.
- [x] `npm run lint` succeeds on the exact candidate head.
- [x] `npm run check:types` succeeds on the exact candidate head.
- [x] `npm run build` succeeds on the exact candidate head.
- [x] `npm run test:unit` succeeds on the exact candidate head.
- [x] `npm run test:rules` succeeds with Java emulator support on the exact candidate head.
- [x] The confined verifier passes pinned Admin, Privacy, and Jobs source, security, build, test, and emulator suites.
- [x] The retained evidence manifest validates every recorded artifact hash.
- [x] All verifier and pinned repository heads match and finish clean.

These checked items are valid only when the current PR head equals the exact SHA in the latest inspected CI artifacts and the corresponding PR and Drive receipts. Any branch or pinned-candidate change makes them pending until rerun and reinspection.

## Protected staging deploy

- [ ] `firebase use urai-staging` succeeds in the authorized protected environment.
- [ ] `npm run deploy:staging` succeeds and remains bound to `--project urai-staging`.
- [ ] Deploy output proves Hosting deployed.
- [ ] Deploy output proves Functions deployed.
- [ ] Deploy output proves Firestore rules deployed.
- [ ] Deploy output proves Firestore indexes deployed.
- [ ] Deploy output proves Storage rules deployed when included by the locked deploy authority.
- [ ] An immutable deploy receipt records the exact merged source SHA and prior rollback state.

## Live smoke and isolation

- [ ] `GET /` returns HTTP 200 from `https://urai-staging.web.app`.
- [ ] `GET /u/adamclamp` returns HTTP 200.
- [ ] `GET /api/healthz` returns HTTP 200 with `status: ok`.
- [ ] `GET /api/buildinfo` returns HTTP 200 with the exact staging project and release SHA.
- [ ] `POST /api/companion` with a valid synthetic message returns HTTP 200.
- [ ] `POST /api/companion` with an empty message returns HTTP 400.
- [ ] `POST /api/waitlist` with a valid synthetic email returns HTTP 200.
- [ ] Protected read-back matches the deployed candidate.
- [ ] Unauthorized write attempts are denied.
- [ ] Cross-tenant access attempts are denied.

## Monitoring, recovery, and rollback

- [ ] Monitoring and uptime evidence are linked and active.
- [ ] The pre-deploy rollback target is recorded.
- [ ] Recovery from an injected or simulated failure is proven.
- [ ] Rollback to the recorded target is executed or otherwise proven through the protected release authority.
- [ ] Post-rollback smoke and build identity checks pass.

## Lock evidence

- [ ] `URAI_STAGING_LOCK.md` is generated after the successful protected deploy.
- [ ] The lock records release candidate SHA, deploy timestamp, staging URL, deploy command, and smoke command.
- [ ] The lock records that no production project or production data was touched.

## System-of-systems boundary

- [x] `URAI_STAGING_READINESS_MATRIX.md` exists and external systems retain separate evidence ownership.
- [x] No external URAI system is claimed complete merely because this repository passes.
- [ ] Protected deployment receipts for every required owning repository are accepted.

## Final statement

The current candidate may be source- and emulator-verified, but it is not complete or live-verified. Completion requires every unchecked protected-deploy, live-isolation, monitoring, recovery, rollback, and external-system item above to pass for `https://urai-staging.web.app`.