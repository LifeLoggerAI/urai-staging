# Build / Test / Deploy Proof

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging

## Inspection performed

Verified through the GitHub connector:
- Repo metadata and permissions.
- README status, repo structure, staging URL, and route/API declarations.
- Root `package.json` scripts.
- `functions/package.json` scripts and dependencies.
- `.firebaserc` staging/production aliases.
- `firebase.json` Hosting, Functions, Firestore, Storage, emulator config, headers, and rewrites.
- `functions/src/index.ts` HTTP and callable Functions.
- Firestore and Storage security rules.
- CI workflow.
- Deploy readiness, staging lock, smoke, bootstrap, doctor, and P0 launch scripts.
- Existing audit/test docs.
- `.env.example` corrected to canonical staging values.

## Commands required for a complete final lock

Run from a fresh authenticated checkout:

```bash
npm install
npm --prefix functions ci
npm run doctor
npm run check:deploy
npm run check:lockfile
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:rules
npm run test:e2e
npm run smoke:staging
```

For a full deploy lock:

```bash
firebase login
firebase use urai-staging
npm run deploy:staging
```

The deploy script should generate `URAI_STAGING_LOCK.md` after install, readiness, lint, typecheck, build, unit tests, optional emulator-backed tests, Firebase deploy to staging, and live smoke all pass.

## Execution status from this pass

| Check | Status | Notes |
|---|---|---|
| GitHub access | PASS | Repo metadata and files were accessible. |
| Default branch | PASS | Default branch is `main`. |
| Static config inspection | PASS | Key Firebase, package, CI, scripts, rules, and docs were inspected. |
| Secrets grep through GitHub search | PASS-LIMITED | Searched common secret indicators and found no hits. This does not replace a full secret scanner. |
| `.env.example` canonical staging alignment | FIXED | Updated stale `urai-staging-35414255` defaults to `urai-staging`. |
| Local install | NOT RUN | No full checkout/package install was available in this assistant runtime. |
| Lint/typecheck/build | NOT RUN | Must run from fresh checkout. |
| Unit tests | NOT RUN | Must run from fresh checkout. |
| Firestore rules/emulator tests | NOT RUN | Requires Java/Firebase emulator environment. |
| Firebase deploy | NOT RUN | Requires Firebase credentials and explicit approval. |
| Live smoke | NOT VERIFIED | The assistant container could not resolve `urai-staging.web.app`; live smoke must run from network-capable environment. |

## Deployment proof status

No final deployment certificate is claimed here.

The repo contains a deployment lock script that is designed to prove deployment to `urai-staging` only. Final readiness requires the generated `URAI_STAGING_LOCK.md` from a successful `npm run deploy:staging` run plus smoke output proving:
- `GET /`
- `GET /u/adamclamp`
- `GET /robots.txt`
- `GET /api/healthz`
- `GET /api/buildinfo`
- `POST /api/companion`
- `POST /api/companion` invalid-message guard
- `POST /api/waitlist` with synthetic staging email

## Current proof conclusion

This pass proves repository structure, staging separation, guardrail intent, and documentation alignment. It does not prove live deployment or runtime health.
