# Workstream C manual verification

Use this only while GitHub-hosted runners are not assigning jobs.

## Run in Google Cloud Shell

```bash
rm -rf ~/urai-staging-manual

git clone --branch workstream-c-manual-verification-20260711 \
  https://github.com/LifeLoggerAI/urai-staging.git \
  ~/urai-staging-manual

cd ~/urai-staging-manual
bash scripts/run-workstream-c-manual-verification.sh
```

The script checks out these exact candidates by default:

- Admin: `71f4f6d461e09bae30584f2bdef6c5deb9c79787`
- Privacy: `f8ed46bec72b7be6cd9ba84bc73fc13a636df600`
- Jobs: `dc299c7a34bd416433f46d329ce18f6119bc31bf`

The three SHAs can also be overridden explicitly through the `ADMIN_SHA`, `PRIVACY_SHA`, and `JOBS_SHA` environment variables. The exact values used are recorded in the generated evidence summary and `heads.tsv`.

The verifier preserves the NVM-selected Node and npm paths in every test subprocess, installs exact pnpm versions through npm, and requires the Admin production preflight to fail for the expected missing-authority reason rather than accepting a missing command as proof.

It runs source, build, test, security, emulator and fail-closed preflight checks. It does not deploy, create infrastructure, call paid providers or mutate production data.

A timestamped evidence archive is written under:

```text
~/urai-workstream-c-manual-*/urai-workstream-c-manual-evidence-*.tar.gz
```

When GitHub CLI is authenticated, the summary is also posted to `LifeLoggerAI/urai-admin#47`.

Manual verification can establish source and emulator evidence. It does not replace protected staging mutation, public-verification or rollback receipts.