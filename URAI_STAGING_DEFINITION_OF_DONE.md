# URAI Staging Definition of Done

`urai-staging` may be called complete only when every required checkbox below is true.

## Repository and config

- [ ] Canonical staging app path is documented as `LifeLoggerAI/urai-staging`.
- [ ] `.firebaserc` maps `default` and `staging` to `urai-staging-35414255`.
- [ ] Production remains separated and is not deployed by staging scripts.
- [ ] `firebase.json` includes Hosting, Functions, Firestore rules, and Firestore indexes.
- [ ] `package.json` routes `deploy:staging` through `lock:staging`.
- [ ] `.env.example` lists required env var names without secret values.

## Local validation

- [ ] `npm --prefix functions ci` succeeds.
- [ ] `npm run check:deploy` succeeds.
- [ ] `npm run lint` succeeds.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `npm run test:unit` succeeds.
- [ ] `npm run test:e2e` succeeds where Java/Nix emulator support is available.

## Deploy

- [ ] `firebase use urai-staging-35414255` succeeds.
- [ ] `firebase deploy --only hosting,functions,firestore:rules,firestore:indexes --project urai-staging-35414255` succeeds.
- [ ] Deploy output shows Hosting deployed.
- [ ] Deploy output shows Functions deployed.
- [ ] Deploy output shows Firestore rules deployed.
- [ ] Deploy output shows Firestore indexes deployed.

## Live smoke

- [ ] `GET /` returns HTTP 200.
- [ ] `GET /u/adamclamp` returns HTTP 200.
- [ ] `GET /api/healthz` returns HTTP 200 with `status: ok`.
- [ ] `GET /api/buildinfo` returns HTTP 200 with staging project metadata.
- [ ] `POST /api/companion` with a valid message returns HTTP 200.
- [ ] `POST /api/companion` with an empty message returns HTTP 400.
- [ ] `POST /api/waitlist` with a valid email returns HTTP 200.
- [ ] Firestore default-deny and owner/admin rules have passed emulator tests.

## Lock evidence

- [ ] `URAI_STAGING_LOCK.md` is generated after the successful deploy.
- [ ] Lock file records release candidate SHA.
- [ ] Lock file records deploy timestamp.
- [ ] Lock file records staging URL.
- [ ] Lock file records deploy and smoke commands.
- [ ] Rollback target SHA is captured outside repo or in release notes before production promotion.

## System-of-systems boundary

- [ ] `URAI_STAGING_READINESS_MATRIX.md` is current.
- [ ] Any system not owned by this repo is marked Partial, Out of Scope, Missing, or Unknown.
- [ ] No external URAI system is claimed complete without its own deploy URL, API contract, smoke output, monitoring link, and rollback SHA.

## Final statement

When all required boxes pass, `urai-staging` is locked for backend staging validation at `https://urai-staging-35414255.web.app`.
