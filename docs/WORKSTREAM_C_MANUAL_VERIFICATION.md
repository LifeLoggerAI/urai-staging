# Workstream C manual verification

Use this only while GitHub-hosted runners are not assigning jobs.

## Run in Google Cloud Shell

```bash
rm -rf ~/urai-staging-manual

git clone --branch workstream-c-manual-verification-20260711 \
  https://github.com/LifeLoggerAI/urai-staging.git \
  ~/urai-staging-manual

cd ~/urai-staging-manual
test -z "$(git status --porcelain --untracked-files=all)"
bash scripts/run-workstream-c-manual-verification.sh
```

The script checks out these exact candidates by default:

- Admin: `71f4f6d461e09bae30584f2bdef6c5deb9c79787`
- Privacy: `f8ed46bec72b7be6cd9ba84bc73fc13a636df600`
- Jobs: `dc299c7a34bd416433f46d329ce18f6119bc31bf`

The candidate SHAs can be overridden explicitly through `ADMIN_SHA`, `PRIVACY_SHA`, and `JOBS_SHA`. The verifier also records its own exact `urai-staging` commit. Every identity must be a lowercase full 40-character SHA.

The verifier preserves the NVM-selected Node and npm paths in every test subprocess, installs exact pnpm versions, and requires the Admin production preflight to fail for the expected missing-authority reason rather than accepting a missing command as proof.

The evidence bundle contains:

- exact verifier and candidate identities in `heads.tsv`;
- logs and exit codes for every source, build, test, security and emulator step;
- the Admin isolated-emulator registry receipt when generated;
- final Git status for every candidate checkout;
- a mandatory `final-source-clean` result for every repository;
- a SHA-256 manifest covering all evidence files;
- a timestamped compressed archive.

Any failed command, candidate SHA mismatch, dirty verifier checkout, or tracked/untracked candidate residue makes the verification fail.

The script does not deploy, create infrastructure, call paid providers, seed cloud Firestore, or mutate production data.

A timestamped evidence archive is written under:

```text
~/urai-workstream-c-manual-*/urai-workstream-c-manual-evidence-*.tar.gz
```

When GitHub CLI is authenticated, the summary is posted to canonical control issue `LifeLoggerAI/urai-admin#46`.

Manual verification can establish source and emulator evidence. It does not replace independent review, protected staging mutation, public verification, provider revision, recovery, or rollback receipts.
