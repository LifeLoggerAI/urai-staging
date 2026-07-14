# Workstream C manual verification

Use this verifier to collect confined source and emulator evidence when GitHub-hosted evidence is incomplete or when an exact local repair candidate must be checked before any remote mutation.

## Current exact candidates

The official wrappers load the canonical pins from `scripts/workstream-c-current-candidates.env`. The current values are mirrored in `docs/WORKSTREAM_C_CURRENT_CANDIDATES.md`.

Do not duplicate candidate SHAs in this runbook. Refresh the machine-readable manifest and its human mirror together whenever a candidate branch advances. Explicit `ADMIN_SHA`, `PRIVACY_SHA`, and `JOBS_SHA` overrides are permitted only as full lowercase 40-character SHAs and are preserved by the official wrappers for confined exact-candidate verification.

## Standalone no-mutation verifier

For an existing checkout:

```bash
cd ~/urai-staging-manual
git fetch origin workstream-c-manual-verification-20260711
git reset --hard origin/workstream-c-manual-verification-20260711
git clean -fd
bash scripts/run-workstream-c-cloud-shell.sh
```

For a fresh checkout:

```bash
rm -rf ~/urai-staging-manual
git clone --branch workstream-c-manual-verification-20260711 \
  https://github.com/LifeLoggerAI/urai-staging.git \
  ~/urai-staging-manual
cd ~/urai-staging-manual
bash scripts/run-workstream-c-cloud-shell.sh
```

`scripts/run-workstream-c-manual-verification.sh` is an equivalent public entrypoint. It routes through `run-workstream-c-cloud-shell.sh`; it cannot call the internal verifier core directly.

The default verifier is read-only with respect to GitHub, cloud infrastructure, provider systems, billing, and production data. It does not deploy, push candidate branches, create infrastructure, call paid providers, seed cloud Firestore, alter credentials, or mutate production data.

Summary publication is disabled by default. To publish a passing summary to `LifeLoggerAI/urai-admin#46`, use the separate explicit opt-in:

```bash
WORKSTREAM_C_PUBLISH_SUMMARY=1 bash scripts/run-workstream-c-cloud-shell.sh
```

Publication requires a fully passing verifier, an available authenticated GitHub CLI, and a successful issue comment. Authentication alone does not publish anything.

## Confined execution boundary

The launcher:

- proves the verifier checkout is clean and exactly equals the current remote control-branch head;
- resolves `WORKSTREAM_C_ROOT` through `scripts/resolve-workstream-c-root.mjs`;
- permits the verifier workspace only as a direct `/tmp/urai-workstream-c-manual-*` child;
- rejects wrong-parent paths, wrong prefixes, unsupported filename characters, symbolic links, and non-directory existing targets;
- runs both the root-resolver and confinement regressions through the actual CI bootstrap;
- removes only prior `urai-workstream-c-manual-*` workspaces and package-manager caches;
- requires at least 8 GiB free in `/tmp` before execution;
- places repositories, package stores, Python caches, Firebase emulator downloads, and temporary files under the confined workspace;
- forces public npm registry resolution for verifier installs;
- isolates Firebase and Cloud SDK configuration from user credentials;
- rejects reachable production credentials and persistent user configuration;
- leaves global Cloud Shell Node, npm, and pnpm installations untouched.

The public manual entrypoint always enters through this launcher. The launcher invokes the internal verifier core only after remote-head, cleanup, disk, path, and environment controls pass.

The evidence bundle contains exact verifier and candidate identities, step logs and exit codes, the Admin emulator receipt when generated, final Git status, mandatory `final-source-clean` results, compact failure excerpts, and a SHA-256 manifest.

Any failed command, SHA mismatch, dirty verifier checkout, candidate residue, credential reachability, or confinement drift makes verification fail.

## Jobs dependency repair operator

`scripts/repair-jobs-unused-error-reporting.sh` is a separate repair workflow, not the standalone verifier. It may create one local Jobs candidate only after proving the expected remote Jobs head, exact changed-file boundary, dependency audit state, worker build inputs, frozen installs, source checks, typecheck, build, and tests.

The repair operator then runs the complete confined Admin/Privacy/Jobs verifier against that exact local Jobs commit and rechecks both the Jobs remote branch and the Staging control branch.

The default repair mode performs local verification only and exits before GitHub authentication or remote mutation. Publishing the exact verified repair requires both:

```bash
JOBS_REPAIR_PUBLISH=1 \
JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR \
bash scripts/repair-jobs-unused-error-reporting.sh
```

A push or required pull-request receipt comment failure is fatal. The operator must never report success after an unrecorded remote mutation.

This repair path does not authorize deployment, infrastructure creation, provider calls, billing actions, credential changes, or production-data operations.

## Evidence limits

Manual verification can establish source and emulator evidence. It does not replace independent review, protected staging apply/nonapply and isolation proof, public verification, immutable deployment receipts, monitoring, recovery, rollback, provider evidence, credential rotation, or named launch approval.
