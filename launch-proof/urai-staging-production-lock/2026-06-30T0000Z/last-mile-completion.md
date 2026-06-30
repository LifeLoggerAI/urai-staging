# Last-Mile Completion Receipt

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging

## Remaining-work checklist recovered from prior pass

- Keep staging clearly labeled as staging, not production.
- Keep `.env.example` aligned with canonical `urai-staging` values.
- Ensure CI produces artifacts, not only console output.
- Ensure deploy workflow is gated to staging only.
- Ensure emulator/rules tests can run in GitHub Actions and Firebase Studio/IDX.
- Preserve truthful PARTIAL status until real Actions/deploy receipts exist.

## Last-mile fixes completed

### 1. Adaptive Java runner added

Added:

- `scripts/run-with-java.sh`

Purpose:

- Uses `nix-shell` when available.
- Falls back to an existing Java runtime when Nix is not available.
- Fails clearly if neither Java nor Nix is available.

Commit:

- `5d6f952ffc1309c92db2d73ec116c0da11ba1bb9`

### 2. Root emulator scripts fixed

Updated `package.json`:

- `test:rules`
- `test:e2e`
- `emulators`

These now call `bash scripts/run-with-java.sh ...` instead of requiring `nix-shell` directly.

This is important because GitHub Actions installs Java with `actions/setup-java`, but does not necessarily provide Nix.

Commit:

- `1d7e065f0c8f484e1ae702b16dd2fd214323473a`

### 3. Deploy readiness now enforces the fix

Updated:

- `scripts/check-deploy-readiness.mjs`

New checks:

- `public/robots.txt` must exist and block indexing.
- `scripts/run-with-java.sh` must exist.
- Public shell must include staging/not-production/synthetic-data copy.
- Emulator scripts must use `scripts/run-with-java.sh`.
- Java runner must support both `nix-shell` and existing Java runtimes.

Commit:

- `d42b9ee6fcaa6f8ee4cad96e685e428c00f8e1b7`

## Current verification status

Verified through GitHub file inspection:

- Repo access: confirmed.
- Branch: `main`.
- Latest last-mile commit inspected: `d42b9ee6fcaa6f8ee4cad96e685e428c00f8e1b7`.
- Combined status for latest commit: no statuses returned by connector.
- Workflow runs for latest commit: none returned by connector.

## Truthful status

This repo is now prepared for the final proof run.

It should not be marked READY until GitHub Actions or a local runner produces:

- install receipt
- lint/typecheck/build receipt
- unit test receipt
- Firestore rules/emulator receipt
- deploy-lock receipt if live deploy is requested
- live smoke receipt if deployed

## Next exact proof path

Run the manual workflow:

- Workflow: `Staging Deploy Lock`
- Input `confirm_staging_project`: `urai-staging`
- Input `run_live_deploy`: `false` for checks-only proof, `true` for full deploy proof when the staging deploy environment is configured.

Expected artifacts:

- `urai-staging-deploy-lock-evidence`
- `urai-staging-launch-evidence`

## Final current status

DONE BUT NEEDS EXTERNAL ENV / RUNNER.

The remaining blocker is not repo code. The remaining blocker is execution evidence from GitHub Actions or a deploy-capable runner.
