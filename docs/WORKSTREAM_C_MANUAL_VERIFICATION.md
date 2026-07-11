# Workstream C manual verification

Use this only while GitHub-hosted runners are not assigning jobs.

## Run in Google Cloud Shell

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

The Cloud Shell launcher defaults to these exact candidates:

- Admin: `71f4f6d461e09bae30584f2bdef6c5deb9c79787`
- Privacy: `a0805316a9975180b27b4086d3bde3dfa91fb215`
- Jobs: `8aff79921c58a256080885adaebb0164f2735d57`

The candidate SHAs can be overridden through `ADMIN_SHA`, `PRIVACY_SHA`, and `JOBS_SHA`. The verifier records its own exact `urai-staging` commit. Every identity must be a lowercase full 40-character SHA.

The launcher:

- removes only prior `urai-workstream-c-manual-*` workspaces and package-manager caches;
- requires at least 8 GiB free in `/tmp` before execution;
- places repositories, Node package stores, Python caches, Firebase emulator downloads and temporary files under a timestamped `/tmp` workspace;
- isolates Firebase CLI configuration from expired Cloud Shell credentials;
- leaves global Cloud Shell Node, npm and pnpm installations untouched.

The verifier preserves NVM-selected Node/npm paths, installs exact pnpm versions in its private workspace, and requires the Admin production preflight to fail for the expected missing-authority reason rather than accepting a missing command as proof.

The evidence bundle contains exact verifier/candidate identities, step logs and exit codes, the Admin emulator receipt when generated, final Git status, mandatory `final-source-clean` results and a SHA-256 manifest.

Any failed command, SHA mismatch, dirty verifier checkout or candidate residue makes verification fail. The script does not deploy, create infrastructure, call paid providers, seed cloud Firestore or mutate production data.

The timestamped evidence archive is written under `/tmp` and its exact path is printed at completion.

When GitHub CLI is authenticated, the summary is posted to canonical control issue `LifeLoggerAI/urai-admin#46`.

Manual verification can establish source and emulator evidence. It does not replace independent review, protected staging mutation, public verification, provider revision, recovery or rollback receipts.