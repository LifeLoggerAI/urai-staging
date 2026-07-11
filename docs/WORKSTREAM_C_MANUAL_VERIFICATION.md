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

The script checks out these exact candidates:

- Admin: `11af3f11160c06dc5d84ed7e4513cab82d5319ba`
- Privacy: `7d48b43b9e5c6b5eb9c35f77d2bc99955ec04d4b`
- Jobs: `6f04463786ad0b065bd1dcfe4a50bd3906be9d05`

It runs source, build, test, security, emulator and fail-closed preflight checks. It does not deploy, create infrastructure, call paid providers or mutate production data.

A timestamped evidence archive is written under:

```text
~/urai-workstream-c-manual-*/urai-workstream-c-manual-evidence-*.tar.gz
```

When GitHub CLI is authenticated, the summary is also posted to `LifeLoggerAI/urai-admin#47`.

Manual verification can establish source and emulator evidence. It does not replace protected staging mutation, public-verification or rollback receipts.
