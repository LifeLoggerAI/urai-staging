# Workstream C manual verification

Use this only while GitHub-hosted runners are not assigning jobs.

## Current controlled execution

The current Jobs candidate still contains the dependency set identified by the completed isolated audit. The isolated rebuild proved the exact zero-finding repair, but that prepared branch is not release evidence and must not be merged independently. Run the guarded operator before the next standalone verifier run:

```bash
cd ~/urai-staging-manual
git fetch origin workstream-c-manual-verification-20260711
git reset --hard origin/workstream-c-manual-verification-20260711
git clean -fd
bash scripts/repair-jobs-unused-error-reporting.sh
```

The repair operator:

- proves the verifier checkout is clean and exactly equals the current remote control-branch head;
- requires Jobs to remain exactly at `1515ff2bbf66f764d125eb2abe7b615c88cedb59`;
- confines every disposable repair directory directly below `/tmp` and rejects symlinks or unsafe override paths;
- proves `@google-cloud/error-reporting` and the three removable Firebase Admin declarations are unused;
- merges the audited transitive pins into any existing override maps instead of replacing prior controls;
- uses only `https://registry.npmjs.org/` without changing persistent pnpm registry configuration;
- regenerates `functions/package-lock.json`, `pnpm-lock.yaml`, and `.pnpm/lock.yaml` and rejects internal registry URLs or divergent lock mirrors;
- runs deterministic npm and pnpm frozen installs;
- captures npm full, npm production, and pnpm workspace audit JSON;
- rejects missing audit metadata, every nonzero severity count, and every nonzero audit command exit;
- runs Functions and asset-worker module-load smoke plus exact-head contracts, source verification, typecheck, build, and tests;
- creates immutable receipt `URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-014` with control SHA, audit exit codes, vulnerability counts, report hashes, artifact hashes, and nonmutation declarations;
- permits only the exact audited manifest, lockfile, and receipt changes;
- rechecks the remote Jobs SHA immediately before pushing;
- commits and pushes only after every gate passes;
- launches the complete Workstream C source/emulator verifier on the resulting Jobs SHA.

If the verifier branch, Jobs branch, filesystem boundary, registry identity, audit result, source gate, or expected changed-file set differs, the operator stops before pushing.

## Standalone verifier run

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
bash scripts/repair-jobs-unused-error-reporting.sh
```

The Cloud Shell launcher currently defaults to these exact candidates:

- Admin: `d10dd517bbf806bae0a92d53383e0c6d620ba523`
- Privacy: `bf9d6f42cba961169c5d6e0aaa24b07a64ba6c01`
- Jobs: `1515ff2bbf66f764d125eb2abe7b615c88cedb59`

The preceding complete manual run established that Admin install, registry contracts, security, active Functions, lint, typecheck, tests, build and fail-closed production preflight passed. It also exposed and led to repairs for generated Admin Functions residue, Privacy YAML/schema and pagination typing, and a truncated Jobs queue processor.

The candidate SHAs can be overridden through `ADMIN_SHA`, `PRIVACY_SHA`, and `JOBS_SHA`. Every identity must be a lowercase full 40-character SHA. The launcher also proves its clean verifier checkout equals the current remote control-branch head before cleaning workspaces or running any candidate.

The launcher:

- resolves `WORKSTREAM_C_ROOT` through `scripts/resolve-workstream-c-root.mjs`;
- permits the verifier workspace only as a direct `/tmp/urai-workstream-c-manual-*` child;
- rejects wrong-parent paths, wrong prefixes, symbolic links and non-directory existing targets;
- runs `scripts/test-workstream-c-root-resolver.mjs` through both `npm run check` and the CI bootstrap;
- removes only prior `urai-workstream-c-manual-*` workspaces and package-manager caches;
- requires at least 8 GiB free in `/tmp` before execution;
- places repositories, package stores, Python caches, Firebase emulator downloads and temporary files under the confined workspace;
- forces public npm registry resolution for verifier installs;
- isolates Firebase and Cloud SDK configuration from user credentials;
- leaves global Cloud Shell Node, npm and pnpm installations untouched.

The verifier preserves NVM-selected Node/npm paths, installs exact pnpm versions privately, runs all relevant local emulators, and requires the Admin production preflight to fail for the expected missing-authority reason rather than accepting a missing command as proof.

The evidence bundle contains exact verifier/candidate identities, step logs and exit codes, the Admin emulator receipt when generated, final Git status, mandatory `final-source-clean` results, compact failure excerpts and a SHA-256 manifest.

Any failed command, SHA mismatch, dirty verifier checkout or candidate residue makes verification fail. The scripts do not deploy, create infrastructure, call paid providers, seed cloud Firestore or mutate production data.

The timestamped evidence archive is written under `/tmp` and its exact path is printed at completion.

When GitHub CLI is authenticated, the summary is posted to canonical control issue `LifeLoggerAI/urai-admin#46`.

Manual verification can establish source and emulator evidence. It does not replace independent review, protected staging mutation, public verification, provider revision, recovery or rollback receipts.
