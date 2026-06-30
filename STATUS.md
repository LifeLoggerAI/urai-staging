# URAI Staging Production Status

Date: 2026-06-30
Repo: `LifeLoggerAI/urai-staging`

## Final status

DONE BUT NEEDS EXTERNAL ENV / RUNNER.

This repo is production-safe as a staging validation environment, but it is not a production app and must not be marked production-ready in the global URAI release plan until current CI/deploy/live-smoke receipts exist.

## What this repo is

`urai-staging` is the Firebase staging backend and validation shell for URAI. It owns:

- Firebase Hosting staging shell
- Cloud Functions smoke and callable endpoints
- Firestore rules
- Storage rules
- indexes
- unit tests
- emulator-backed rules tests
- CI evidence workflow
- gated staging deploy-lock workflow
- launch-proof documentation

## What this repo is not

This repo does not own:

- the full URAI production UI
- sibling product modules
- production deployment
- real user data
- public launch claims

## Current implemented guardrails

- Canonical staging project: `urai-staging`
- Canonical staging URL target: `https://urai-staging.web.app`
- Public staging shell includes not-production copy.
- `public/robots.txt` blocks indexing.
- `.env.example` uses canonical staging values.
- Deploy script delegates to a staging-only lock script.
- GitHub Actions has CI evidence artifact upload.
- GitHub Actions has a manual gated staging deploy-lock workflow.
- Emulator tests use `scripts/run-with-java.sh`, which supports both Nix and existing Java runtimes.
- Deploy readiness checks enforce staging labels, robots block, adaptive runner, and staging project binding.

## Latest repo-side completion commits

- `bcc43d9b0650ad7c3f6d67242b15d7b5aae4dae6` - align env example with canonical staging project.
- `7b4f661cd1fd34a3086c86fd14219fcd70d192a8` - add public staging disclaimer.
- `321a6aec92592a0133e0633e5530e41841718d9f` - upload staging launch evidence artifacts from CI.
- `da06695ddb14c999ed7001bb87cf39cabc160924` - add gated staging deploy workflow.
- `65d24b5aa94da704cef1f660aa521941c882127d` - write deploy-lock evidence summary.
- `5d6f952ffc1309c92db2d73ec116c0da11ba1bb9` - make emulator tests work without a hard Nix dependency.
- `1d7e065f0c8f484e1ae702b16dd2fd214323473a` - route emulator scripts through adaptive Java runner.
- `d42b9ee6fcaa6f8ee4cad96e685e428c00f8e1b7` - enforce adaptive emulator runner in deploy readiness.
- `cf9f0bbf48409b640ef1d316a5ac61bb882df266` - add last-mile completion receipt.
- `18e44da23aa787b726ad2a74d7dc63f17b9cc7f9` - align README with last-mile status.

## Verification receipts available now

Repo-inspection receipts are available in:

- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/README.md`
- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/environment-map.md`
- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/build-test-deploy-proof.md`
- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/blockers.md`
- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/actions-hardening.md`
- `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/last-mile-completion.md`

## Verification still required

The following receipts are still required before marking READY:

- current install receipt
- lint receipt
- typecheck receipt
- production build receipt
- unit test receipt
- Firestore emulator/rules test receipt
- deploy-lock receipt if live deploy is requested
- live smoke receipt if deployed

## Exact proof commands

Checks-only proof:

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
```

Full staging deploy-lock proof:

```bash
firebase use urai-staging
npm run deploy:staging
```

GitHub Actions proof path:

- Run workflow: `CI`
- Preserve artifact: `urai-staging-launch-evidence`

Manual deploy-lock proof path:

- Run workflow: `Staging Deploy Lock`
- Input `confirm_staging_project`: `urai-staging`
- Input `run_live_deploy`: `false` for checks-only proof, `true` for full deploy-lock proof when the staging deploy environment is configured.
- Preserve artifact: `urai-staging-deploy-lock-evidence`

## Feature truth table

| Feature | Status |
|---|---|
| Firebase Hosting staging shell | WIRED BUT NEEDS ENV |
| Public staging disclaimer | LIVE / VERIFIED IN REPO |
| `public/robots.txt` staging block | LIVE / VERIFIED IN REPO |
| HTTP health/buildinfo routes | WIRED BUT NEEDS ENV |
| Companion smoke endpoint | DEMO-GATED |
| Waitlist staging write smoke | WIRED BUT NEEDS ENV |
| Callable auth/admin checks | WIRED BUT NEEDS ENV |
| Firestore rules | WIRED BUT NEEDS RUNNER |
| Storage rules | WIRED BUT NEEDS RUNNER |
| Emulator/rules tests | WIRED BUT NEEDS RUNNER |
| CI evidence artifacts | WIRED BUT NEEDS ACTIONS RUN |
| Gated staging deploy workflow | WIRED BUT NEEDS ACTIONS RUN |
| Full production UI | NOT PRESENT |
| Production deploy | DISABLED FOR SAFETY / NOT PRESENT |
| Live deploy receipt | NOT PRESENT |
| Live smoke receipt | NOT PRESENT |

## Ecosystem coordinator summary

`urai-staging` is DONE BUT NEEDS EXTERNAL ENV/RUNNER: repo-side staging guardrails, CI evidence workflow, gated deploy workflow, adaptive emulator runner, public disclaimer, robots block, README/status docs, and launch-proof receipts are committed; do not mark production-ready until current Actions/deploy/live-smoke artifacts pass.
