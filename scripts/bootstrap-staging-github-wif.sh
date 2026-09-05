#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID='urai-staging'
POOL_ID='urai-github-staging'
PROVIDER_ID='github-actions'
SERVICE_ACCOUNT_ID='urai-staging-github-deployer'
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
GITHUB_OWNER='LifeLoggerAI'
GITHUB_OWNER_ID='215797546'
GITHUB_REPOSITORY='LifeLoggerAI/urai-staging'
GITHUB_REPOSITORY_ID='1150947098'
EXPECTED_REF='refs/heads/main'
EXPECTED_ENVIRONMENT='staging'

command -v gcloud >/dev/null 2>&1 || { echo 'gcloud CLI is required.' >&2; exit 2; }

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$ACTIVE_ACCOUNT" ] || { echo 'Authenticate gcloud with an approved human cloud administrator first.' >&2; exit 3; }
CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
[ "$CURRENT_PROJECT" = "$PROJECT_ID" ] || { echo "Refusing to operate outside project $PROJECT_ID (current: ${CURRENT_PROJECT:-unset})." >&2; exit 4; }
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
[[ "$PROJECT_NUMBER" =~ ^[0-9]+$ ]] || { echo 'Could not resolve project number.' >&2; exit 5; }

# Effective/inherited IAM proof uses Cloud Asset Inventory. This API enablement is
# confined to the isolated staging project and is performed only by the approved
# human Google Cloud administrator running this bootstrap.
gcloud services enable cloudasset.googleapis.com --project="$PROJECT_ID" >/dev/null

PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
ATTRIBUTE_MAPPING='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner=assertion.repository_owner,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment'
ATTRIBUTE_CONDITION="assertion.repository_owner_id=='${GITHUB_OWNER_ID}' && assertion.repository_id=='${GITHUB_REPOSITORY_ID}' && assertion.ref=='${EXPECTED_REF}' && assertion.environment=='${EXPECTED_ENVIRONMENT}'"
WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository_id/${GITHUB_REPOSITORY_ID}"

if ! gcloud iam workload-identity-pools describe "$POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --display-name='URAI GitHub staging' \
    --description='Keyless GitHub Actions identity for isolated URAI staging only.'
fi

if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --workload-identity-pool="$POOL_ID" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
    --workload-identity-pool="$POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$ATTRIBUTE_MAPPING" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --workload-identity-pool="$POOL_ID" \
    --location=global \
    --project="$PROJECT_ID" \
    --display-name='URAI staging GitHub Actions' \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$ATTRIBUTE_MAPPING" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
fi

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
    --project="$PROJECT_ID" \
    --display-name='URAI staging GitHub deployer' \
    --description='Keyless GitHub Actions identity for isolated urai-staging. No user-managed keys.'
fi

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --role='roles/iam.workloadIdentityUser' \
  --member="$WIF_MEMBER" >/dev/null

# Read-only permissions are sufficient for the first protected provider probe.
# Cloud Asset/role/service-usage reads are included so the probe can distinguish
# direct project IAM from effective inherited IAM. Deployment mutation roles are
# intentionally NOT granted here.
for role in \
  roles/viewer \
  roles/iam.securityReviewer \
  roles/iam.workloadIdentityPoolViewer \
  roles/cloudasset.viewer \
  roles/iam.roleViewer \
  roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="$role" \
    --condition=None >/dev/null
done

USER_KEYS="$(gcloud iam service-accounts keys list --iam-account="$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" --filter='keyType=USER_MANAGED' --format='value(name)' 2>/dev/null || true)"
[ -z "$USER_KEYS" ] || { echo 'Refusing completion: user-managed service-account keys exist.' >&2; exit 6; }

PROVIDER_JSON="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --workload-identity-pool="$POOL_ID" --location=global --project="$PROJECT_ID" --format=json)"
PROVIDER_JSON="$PROVIDER_JSON" EXPECTED_CONDITION="$ATTRIBUTE_CONDITION" node <<'NODE'
const provider = JSON.parse(process.env.PROVIDER_JSON);
const failures = [];
if (provider.oidc?.issuerUri !== 'https://token.actions.githubusercontent.com') failures.push('issuer');
if (provider.attributeCondition !== process.env.EXPECTED_CONDITION) failures.push('attribute condition');
const mapping = provider.attributeMapping || {};
for (const key of ['google.subject','attribute.repository_id','attribute.repository_owner_id','attribute.ref','attribute.environment']) {
  if (!mapping[key]) failures.push(`mapping ${key}`);
}
if (failures.length) throw new Error(`WIF bootstrap read-back mismatch: ${failures.join(', ')}`);
NODE

cat <<EOF
STAGING_WIF_BOOTSTRAP_OK
project_id=$PROJECT_ID
project_number=$PROJECT_NUMBER
wif_provider=$PROVIDER_RESOURCE
deploy_service_account=$SERVICE_ACCOUNT_EMAIL
repository=$GITHUB_REPOSITORY
repository_id=$GITHUB_REPOSITORY_ID
ref=$EXPECTED_REF
environment=$EXPECTED_ENVIRONMENT
effective_iam_readback=cloudasset.googleapis.com
human_operator=$ACTIVE_ACCOUNT

Set these NON-SECRET GitHub staging environment/repository variables exactly:
GCP_WIF_PROVIDER=$PROVIDER_RESOURCE
GCP_STAGING_DEPLOY_SERVICE_ACCOUNT=$SERVICE_ACCOUNT_EMAIL

Then re-run the failed protected provider probe job/run. Do not create or upload a service-account key.
EOF
