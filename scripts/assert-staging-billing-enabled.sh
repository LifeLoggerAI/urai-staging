#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID='urai-staging'
command -v gcloud >/dev/null 2>&1 || { echo 'gcloud CLI is required.' >&2; exit 2; }

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
[ "$CURRENT_PROJECT" = "$PROJECT_ID" ] || {
  echo "Refusing billing readback outside project $PROJECT_ID (current: ${CURRENT_PROJECT:-unset})." >&2
  exit 3
}

BILLING_JSON="$(gcloud billing projects describe "$PROJECT_ID" --format=json)"
BILLING_JSON="$BILLING_JSON" PROJECT_ID="$PROJECT_ID" node <<'NODE'
const info = JSON.parse(process.env.BILLING_JSON);
const failures = [];
if (info.projectId && info.projectId !== process.env.PROJECT_ID) failures.push('project identity');
if (info.billingEnabled !== true) failures.push('billing disabled');
if (!info.billingAccountName) failures.push('billing account association absent');
if (failures.length) throw new Error(`staging billing gate failed: ${failures.join(', ')}`);
NODE

echo 'STAGING_BILLING_ENABLED_OK'
echo "project_id=$PROJECT_ID"
echo 'billing_enabled=true'
echo 'billing_account_association=present'
