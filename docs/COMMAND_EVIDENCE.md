# URAI Command Evidence

Generated from remote repository inspection on 2026-05-21.

## Scope

Primary repo inspected: `LifeLoggerAI/urai-staging`.

This repo is a Firebase staging backend and validation shell, not the full production Next.js UI. The full product UI appears to live in sibling repos such as `LifeLoggerAI/UrAi`, `LifeLoggerAI/UrAiProd`, and `LifeLoggerAI/UrAi-Dev`.

## Verified repository facts

- Root package: `urai-staging`.
- Node engine: `20`.
- Firebase hosting site: `urai-staging`.
- Hosting public directory: `public`.
- Functions source: `functions`.
- Firestore rules file: `firestore.rules`.
- Storage rules file: `storage.rules`.
- HTTP staging routes: `/api/healthz`, `/api/buildinfo`, `/api/companion`, `/api/waitlist`.
- Catch-all hosting rewrite serves `public/index.html` for route smoke coverage.

## Command compatibility added

The root `package.json` now includes aliases matching the URAI launch audit contract:

| Requested command | Staging implementation |
| --- | --- |
| `npm run check:firebase` | delegates to `npm run check:deploy` |
| `npm run check:lockfile` | runs `node scripts/check-lockfile.mjs` |
| `npm run check:v1` | delegates to `npm run check:deploy` |
| `npm run validate:completion` | delegates to `npm run check:deploy` |
| `npm run check:types` | delegates to `npm run typecheck` |
| `npm run test:smoke` | delegates to `npm run smoke:staging` |
| `npm run launch:p0` | runs `node scripts/launch-p0.mjs` |

## Commands not executed here

The repository was inspected and edited through the connected GitHub API. I did not have a local checkout with installed dependencies, Firebase CLI login, Java emulator runtime, or deployment credentials in this chat environment, so these commands still need to be run in Firebase Studio or a local clone:

```bash
npm --prefix functions ci
npm run check:firebase
npm run check:lockfile
npm run check:v1
npm run validate:completion
npm run check:types
npm run lint
npm run test:unit
npm run test:rules
npm run test:e2e
npm run build
npm run preflight
URAI_P0_RUN_COMMANDS=1 npm run launch:p0
```

## Current expected blocker

`npm run check:lockfile` is strict. It will fail until one of these lockfiles is present and committed:

- `functions/package-lock.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`

For this repo, the preferred fix is:

```bash
npm --prefix functions install
npm --prefix functions ci
```

Then commit `functions/package-lock.json`.

## Deployment commands

After all checks pass and Firebase credentials are available:

```bash
firebase use urai-staging
npm run deploy:staging
bash scripts/smoke-staging.sh
```
