#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID='urai-staging'
SERVICE_ACCOUNT_ID='urai-staging-github-deployer'
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRETS=(TWILIO_AUTH_TOKEN TWILIO_ACCOUNT_SID)

command -v gcloud >/dev/null 2>&1 || { echo 'gcloud CLI is required.' >&2; exit 2; }

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$ACTIVE_ACCOUNT" ] || { echo 'Authenticate gcloud with an approved human cloud administrator first.' >&2; exit 3; }

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
[ "$CURRENT_PROJECT" = "$PROJECT_ID" ] || {
  echo "Refusing to operate outside project $PROJECT_ID (current: ${CURRENT_PROJECT:-unset})." >&2
  exit 4
}

gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null

for secret_name in "${SECRETS[@]}"; do
  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret_name"       --project="$PROJECT_ID"       --replication-policy=automatic >/dev/null
  fi

  gcloud secrets add-iam-policy-binding "$secret_name"     --project="$PROJECT_ID"     --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}"     --role='roles/secretmanager.secretVersionAdder' >/dev/null

  policy="$(gcloud secrets get-iam-policy "$secret_name" --project="$PROJECT_ID" --format=json)"
  POLICY="$policy" SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_EMAIL" node <<'NODE'
const policy = JSON.parse(process.env.POLICY);
const expected = `serviceAccount:${process.env.SERVICE_ACCOUNT_EMAIL}`;
const forbidden = new Set([
  'roles/secretmanager.admin',
  'roles/secretmanager.secretAccessor',
  'roles/owner',
  'roles/editor'
]);
let foundAdder = false;
const violations = [];
for (const binding of policy.bindings || []) {
  const members = binding.members || [];
  if (!members.includes(expected)) continue;
  if (binding.role === 'roles/secretmanager.secretVersionAdder') foundAdder = true;
  if (forbidden.has(binding.role)) violations.push(binding.role);
}
if (!foundAdder) throw new Error('secretVersionAdder binding missing');
if (violations.length) throw new Error(`forbidden broad secret roles: ${violations.join(', ')}`);
NODE
done

cat <<EOF
STAGING_TWILIO_PROOF_IAM_OK
project_id=$PROJECT_ID
service_account=$SERVICE_ACCOUNT_EMAIL
secret_resources=TWILIO_AUTH_TOKEN,TWILIO_ACCOUNT_SID
granted_role=roles/secretmanager.secretVersionAdder
broad_secret_roles_granted=false
human_operator=$ACTIVE_ACCOUNT

This bootstrap creates only empty Secret Manager resources when absent.
It does not add secret values.
It does not grant Secret Manager admin or accessor roles.
It does not grant Cloud Functions deployment roles.
EOF
