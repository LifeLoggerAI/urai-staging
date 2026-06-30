# Actions Hardening Proof

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging

## What changed

Two GitHub Actions improvements were added after the first audit pass.

## CI evidence artifacts

`.github/workflows/ci.yml` now supports manual dispatch in addition to pull requests and pushes to `main`.

It also uploads staging launch evidence artifacts after the bootstrap and validation steps:

- `artifacts/launch/staging-bootstrap-report.json`
- `artifacts/launch/staging-bootstrap-summary.md`

Artifact name:

- `urai-staging-launch-evidence`

Commit:

- `321a6aec92592a0133e0633e5530e41841718d9f`

## Gated staging deploy workflow

`.github/workflows/staging-deploy.yml` was added.

It is manual-dispatch only and includes a hard guard requiring the operator to type the exact staging project ID before the job proceeds.

It runs:

- root/package setup
- Functions dependency install
- repo doctor
- deploy readiness check
- lockfile/engine check
- lint
- typecheck
- build
- unit tests
- Firestore rules tests

The live deploy step is gated behind an explicit boolean input and staging credentials. The workflow deploys through the existing repo script `npm run deploy:staging`, preserving the staging-only guardrails already implemented in `scripts/urai-staging-lock.sh`.

Artifact name:

- `urai-staging-deploy-lock-evidence`

Commit:

- `da06695ddb14c999ed7001bb87cf39cabc160924`

## Current status

This creates the GitHub Actions path needed to produce the missing receipts. It does not by itself prove deploy success until the workflow is run with valid staging credentials and the generated artifacts are inspected.

## Final remaining lock criteria

The repo can only move from PARTIAL to READY after one of these produces evidence:

1. CI bootstrap succeeds and uploads launch evidence artifacts.
2. Manual staging deploy workflow succeeds and uploads deploy-lock evidence.
3. `URAI_STAGING_LOCK.md` is generated from a real staging deploy and committed or preserved as an artifact.
