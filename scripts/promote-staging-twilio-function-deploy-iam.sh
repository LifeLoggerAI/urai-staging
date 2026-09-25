#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID='urai-staging'
DEPLOY_SERVICE_ACCOUNT='urai-staging-github-deployer@urai-staging.iam.gserviceaccount.com'
: "${RUNTIME_SERVICE_ACCOUNT_EMAIL:?Set RUNTIME_SERVICE_ACCOUNT_EMAIL from the sanitized provider readback before promotion}"
: "${CONFIRM_STAGING_FUNCTION_DEPLOY_IAM:?Set CONFIRM_STAGING_FUNCTION_DEPLOY_IAM=urai-staging-functions-only}"

[ "$CONFIRM_STAGING_FUNCTION_DEPLOY_IAM" = 'urai-staging-functions-only' ] || {
  echo 'Explicit staging Functions IAM confirmation is required.' >&2
  exit 2
}

case "$RUNTIME_SERVICE_ACCOUNT_EMAIL" in
  *@urai-staging.iam.gserviceaccount.com) ;;
  *) echo 'Runtime service account must belong to urai-staging.' >&2; exit 3 ;;
esac

command -v gcloud >/dev/null 2>&1 || { echo 'gcloud CLI is required.' >&2; exit 4; }

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$ACTIVE_ACCOUNT" ] || { echo 'Authenticate gcloud with an approved human cloud administrator first.' >&2; exit 5; }

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
[ "$CURRENT_PROJECT" = "$PROJECT_ID" ] || {
  echo "Refusing to operate outside project $PROJECT_ID (current: ${CURRENT_PROJECT:-unset})." >&2
  exit 6
}

gcloud iam service-accounts describe "$DEPLOY_SERVICE_ACCOUNT" --project="$PROJECT_ID" >/dev/null
gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null

# Firebase documents Cloud Functions Admin + Service Account User as the
# deployment role pair for delegated Functions deployment. Keep both confined
# to the isolated urai-staging project/runtime identity.
gcloud projects add-iam-policy-binding "$PROJECT_ID"   --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"   --role='roles/cloudfunctions.admin'   --condition=None >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SERVICE_ACCOUNT_EMAIL"   --project="$PROJECT_ID"   --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"   --role='roles/iam.serviceAccountUser' >/dev/null

# The deployed Functions runtime, not the GitHub deploy identity, must be able to
# read exactly the two Twilio secrets referenced through Firebase defineSecret().
# Keep this binding resource-scoped to those two staging secrets.
for secret_name in TWILIO_AUTH_TOKEN TWILIO_ACCOUNT_SID; do
  gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT_EMAIL" \
    --role='roles/secretmanager.secretAccessor' >/dev/null

done

PROJECT_POLICY="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"
RUNTIME_POLICY="$(gcloud iam service-accounts get-iam-policy "$RUNTIME_SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" --format=json)"

TWILIO_AUTH_POLICY="$(gcloud secrets get-iam-policy TWILIO_AUTH_TOKEN --project="$PROJECT_ID" --format=json)"
TWILIO_SID_POLICY="$(gcloud secrets get-iam-policy TWILIO_ACCOUNT_SID --project="$PROJECT_ID" --format=json)"

PROJECT_POLICY="$PROJECT_POLICY" RUNTIME_POLICY="$RUNTIME_POLICY" TWILIO_AUTH_POLICY="$TWILIO_AUTH_POLICY" TWILIO_SID_POLICY="$TWILIO_SID_POLICY" DEPLOY_SERVICE_ACCOUNT="$DEPLOY_SERVICE_ACCOUNT" RUNTIME_SERVICE_ACCOUNT_EMAIL="$RUNTIME_SERVICE_ACCOUNT_EMAIL" node <<'NODE'
const projectPolicy = JSON.parse(process.env.PROJECT_POLICY);
const runtimePolicy = JSON.parse(process.env.RUNTIME_POLICY);
const deployMember = `serviceAccount:${process.env.DEPLOY_SERVICE_ACCOUNT}`;

const has = (policy, role) =>
  (policy.bindings || []).some((binding) =>
    binding.role === role && (binding.members || []).includes(deployMember));

const failures = [];
if (!has(projectPolicy, 'roles/cloudfunctions.admin')) failures.push('Cloud Functions Admin');
if (!has(runtimePolicy, 'roles/iam.serviceAccountUser')) failures.push('runtime Service Account User');

const runtimeMember = `serviceAccount:${process.env.RUNTIME_SERVICE_ACCOUNT_EMAIL}`;
for (const [name,raw] of [
  ['TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_POLICY],
  ['TWILIO_ACCOUNT_SID', process.env.TWILIO_SID_POLICY]
]) {
  const policy = JSON.parse(raw);
  const accessor = (policy.bindings || []).some((binding) =>
    binding.role === 'roles/secretmanager.secretAccessor' && (binding.members || []).includes(runtimeMember));
  if (!accessor) failures.push(`${name} runtime Secret Accessor`);
}

const forbiddenProjectRoles = new Set([
  'roles/owner',
  'roles/editor',
  'roles/secretmanager.admin',
  'roles/firebase.admin'
]);
for (const binding of projectPolicy.bindings || []) {
  if (!(binding.members || []).includes(deployMember)) continue;
  if (forbiddenProjectRoles.has(binding.role)) failures.push(`forbidden broad project role ${binding.role}`);
}
if (failures.length) throw new Error(failures.join(', '));
NODE

cat <<EOF
STAGING_FUNCTION_DEPLOY_IAM_OK
project_id=$PROJECT_ID
deploy_service_account=$DEPLOY_SERVICE_ACCOUNT
runtime_service_account=$RUNTIME_SERVICE_ACCOUNT_EMAIL
project_role=roles/cloudfunctions.admin
runtime_role=roles/iam.serviceAccountUser
production_authority=false
secret_admin_authority=false
runtime_secret_access_scope=TWILIO_AUTH_TOKEN,TWILIO_ACCOUNT_SID
runtime_secret_accessor_only=true
human_operator=$ACTIVE_ACCOUNT

This promotion is confined to urai-staging.
It does not grant Owner, Editor, Firebase Admin, or Secret Manager Admin.
It must be run only after the sanitized provider readback identifies the runtime service account.
EOF
