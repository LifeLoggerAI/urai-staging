#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID='urai-staging'
DEPLOY_SERVICE_ACCOUNT='urai-staging-github-deployer@urai-staging.iam.gserviceaccount.com'
RUNTIME_SERVICE_ACCOUNT_EMAIL="${RUNTIME_SERVICE_ACCOUNT_EMAIL:-urai-staging-functions-runtime@urai-staging.iam.gserviceaccount.com}"
: "${CONFIRM_STAGING_SENDGRID_IAM:?Set CONFIRM_STAGING_SENDGRID_IAM=urai-staging-sendgrid-functions-only}"

[ "$CONFIRM_STAGING_SENDGRID_IAM" = 'urai-staging-sendgrid-functions-only' ] || {
  echo 'Explicit SendGrid staging Functions IAM confirmation is required.' >&2
  exit 2
}

case "$RUNTIME_SERVICE_ACCOUNT_EMAIL" in
  *@urai-staging.iam.gserviceaccount.com) ;;
  *) echo 'Runtime service account must belong to urai-staging.' >&2; exit 3 ;;
esac

[ "$RUNTIME_SERVICE_ACCOUNT_EMAIL" != "$DEPLOY_SERVICE_ACCOUNT" ] || {
  echo 'Runtime and deploy service accounts must remain distinct.' >&2
  exit 4
}

command -v gcloud >/dev/null 2>&1 || { echo 'gcloud CLI is required.' >&2; exit 5; }

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$ACTIVE_ACCOUNT" ] || { echo 'Authenticate gcloud with an approved human cloud administrator first.' >&2; exit 6; }

CURRENT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
[ "$CURRENT_PROJECT" = "$PROJECT_ID" ] || {
  echo "Refusing to operate outside project $PROJECT_ID (current: ${CURRENT_PROJECT:-unset})." >&2
  exit 7
}

BILLING_ENABLED="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || true)"
case "$BILLING_ENABLED" in
  true|True|TRUE) ;;
  *)
    echo "Refusing staging IAM/Secret Manager mutation while billing is disabled for $PROJECT_ID." >&2
    echo "Enable billing on the isolated staging project, then rerun this exact bootstrap." >&2
    exit 10
    ;;
esac

gcloud iam service-accounts describe "$DEPLOY_SERVICE_ACCOUNT" --project="$PROJECT_ID" >/dev/null

if ! gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create urai-staging-functions-runtime \
    --project="$PROJECT_ID" \
    --display-name='UrAi staging Functions runtime' >/dev/null
fi
gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" >/dev/null

PRE_PROJECT_POLICY="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"
PRE_PROJECT_POLICY="$PRE_PROJECT_POLICY" DEPLOY_SERVICE_ACCOUNT="$DEPLOY_SERVICE_ACCOUNT" RUNTIME_SERVICE_ACCOUNT_EMAIL="$RUNTIME_SERVICE_ACCOUNT_EMAIL" node <<'NODE'
const p = JSON.parse(process.env.PRE_PROJECT_POLICY);
const members = new Set([
  `serviceAccount:${process.env.DEPLOY_SERVICE_ACCOUNT}`,
  `serviceAccount:${process.env.RUNTIME_SERVICE_ACCOUNT_EMAIL}`
]);
const forbidden = new Set([
  'roles/owner',
  'roles/editor',
  'roles/firebase.admin',
  'roles/secretmanager.admin',
  'roles/secretmanager.secretAccessor'
]);
const violations=[];
for (const b of p.bindings || []) {
  if (!forbidden.has(b.role)) continue;
  for (const m of b.members || []) if (members.has(m)) violations.push(`${m} -> ${b.role}`);
}
if (violations.length) throw new Error(`refusing IAM promotion before mutation: ${violations.join(', ')}`);
NODE

# The exact callback deploy requires only isolated staging Functions deployment
# plus actAs on the proven runtime identity.
gcloud projects add-iam-policy-binding "$PROJECT_ID"   --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"   --role='roles/cloudfunctions.admin'   --condition=None >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SERVICE_ACCOUNT_EMAIL"   --project="$PROJECT_ID"   --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"   --role='roles/iam.serviceAccountUser' >/dev/null

# Create only the three secret resources bound by the exact callback. Do not
# invent TWILIO_AUTH_TOKEN content. The SendGrid workflow supplies new versions
# only for the two synthetic/sendgrid proof secrets.
for secret in SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY DELIVERY_STATUS_CALLBACK_SECRET TWILIO_AUTH_TOKEN; do
  if ! gcloud secrets describe "$secret" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret" --project="$PROJECT_ID" --replication-policy=automatic >/dev/null
  fi
done

# GitHub deploy identity may append versions only to the two proof secrets.
for secret in SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY DELIVERY_STATUS_CALLBACK_SECRET; do
  gcloud secrets add-iam-policy-binding "$secret"     --project="$PROJECT_ID"     --member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"     --role='roles/secretmanager.secretVersionAdder' >/dev/null
done

# Runtime reads are resource-scoped to the exact callback-bound secrets.
for secret in SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY DELIVERY_STATUS_CALLBACK_SECRET TWILIO_AUTH_TOKEN; do
  gcloud secrets add-iam-policy-binding "$secret"     --project="$PROJECT_ID"     --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT_EMAIL"     --role='roles/secretmanager.secretAccessor' >/dev/null
done

PROJECT_POLICY="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"
RUNTIME_POLICY="$(gcloud iam service-accounts get-iam-policy "$RUNTIME_SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" --format=json)"

PROJECT_POLICY="$PROJECT_POLICY" RUNTIME_POLICY="$RUNTIME_POLICY" DEPLOY_SERVICE_ACCOUNT="$DEPLOY_SERVICE_ACCOUNT" RUNTIME_SERVICE_ACCOUNT_EMAIL="$RUNTIME_SERVICE_ACCOUNT_EMAIL" node <<'NODE'
const project = JSON.parse(process.env.PROJECT_POLICY);
const runtime = JSON.parse(process.env.RUNTIME_POLICY);
const deploy = `serviceAccount:${process.env.DEPLOY_SERVICE_ACCOUNT}`;
const runtimeMember = `serviceAccount:${process.env.RUNTIME_SERVICE_ACCOUNT_EMAIL}`;
const failures=[];
const projectHas=(role,member)=>(project.bindings||[]).some(b=>b.role===role&&(b.members||[]).includes(member));
const runtimeHas=(role,member)=>(runtime.bindings||[]).some(b=>b.role===role&&(b.members||[]).includes(member));
if (!projectHas('roles/cloudfunctions.admin', deploy)) failures.push('deploy cloudfunctions.admin');
if (!runtimeHas('roles/iam.serviceAccountUser', deploy)) failures.push('runtime iam.serviceAccountUser');

const forbidden = new Set(['roles/owner','roles/editor','roles/firebase.admin','roles/secretmanager.admin','roles/secretmanager.secretAccessor']);
for (const b of project.bindings || []) {
  if (!forbidden.has(b.role)) continue;
  if ((b.members||[]).includes(deploy)) failures.push(`forbidden deploy ${b.role}`);
  if ((b.members||[]).includes(runtimeMember)) failures.push(`forbidden runtime ${b.role}`);
}
if (failures.length) throw new Error(failures.join(', '));
NODE

for secret in SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY DELIVERY_STATUS_CALLBACK_SECRET; do
  policy="$(gcloud secrets get-iam-policy "$secret" --project="$PROJECT_ID" --format=json)"
  POLICY="$policy" DEPLOY_SERVICE_ACCOUNT="$DEPLOY_SERVICE_ACCOUNT" RUNTIME_SERVICE_ACCOUNT_EMAIL="$RUNTIME_SERVICE_ACCOUNT_EMAIL" SECRET="$secret" node <<'NODE'
const p=JSON.parse(process.env.POLICY);
const deploy=`serviceAccount:${process.env.DEPLOY_SERVICE_ACCOUNT}`;
const runtime=`serviceAccount:${process.env.RUNTIME_SERVICE_ACCOUNT_EMAIL}`;
const has=(role,member)=>(p.bindings||[]).some(b=>b.role===role&&(b.members||[]).includes(member));
if (!has('roles/secretmanager.secretVersionAdder',deploy)) throw new Error(`${process.env.SECRET}: deploy versionAdder missing`);
if (!has('roles/secretmanager.secretAccessor',runtime)) throw new Error(`${process.env.SECRET}: runtime accessor missing`);
NODE
done

twilio_policy="$(gcloud secrets get-iam-policy TWILIO_AUTH_TOKEN --project="$PROJECT_ID" --format=json)"
POLICY="$twilio_policy" RUNTIME_SERVICE_ACCOUNT_EMAIL="$RUNTIME_SERVICE_ACCOUNT_EMAIL" node <<'NODE'
const p=JSON.parse(process.env.POLICY);
const runtime=`serviceAccount:${process.env.RUNTIME_SERVICE_ACCOUNT_EMAIL}`;
const ok=(p.bindings||[]).some(b=>b.role==='roles/secretmanager.secretAccessor'&&(b.members||[]).includes(runtime));
if (!ok) throw new Error('TWILIO_AUTH_TOKEN runtime accessor missing');
NODE

USER_KEYS="$(gcloud iam service-accounts keys list --iam-account="$DEPLOY_SERVICE_ACCOUNT" --project="$PROJECT_ID" --filter='keyType=USER_MANAGED' --format='value(name)' 2>/dev/null || true)"
[ -z "$USER_KEYS" ] || { echo 'Refusing completion: deploy identity has user-managed keys.' >&2; exit 8; }

TWILIO_ENABLED_VERSION="$(gcloud secrets versions list TWILIO_AUTH_TOKEN --project="$PROJECT_ID" --filter='state=ENABLED' --format='value(name)' --limit=1 2>/dev/null || true)"

cat <<EOF
STAGING_SENDGRID_FUNCTION_IAM_OK
project_id=$PROJECT_ID
deploy_service_account=$DEPLOY_SERVICE_ACCOUNT
runtime_service_account=$RUNTIME_SERVICE_ACCOUNT_EMAIL
deploy_project_role=roles/cloudfunctions.admin
runtime_act_as_role=roles/iam.serviceAccountUser
deploy_secret_version_scope=SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY,DELIVERY_STATUS_CALLBACK_SECRET
runtime_secret_access_scope=SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY,DELIVERY_STATUS_CALLBACK_SECRET,TWILIO_AUTH_TOKEN
project_wide_secret_accessor=false
secret_manager_admin=false
owner_editor_firebase_admin=false
user_managed_deploy_keys=false
twilio_auth_token_enabled_version=$([ -n "$TWILIO_ENABLED_VERSION" ] && echo present || echo absent)
human_operator=$ACTIVE_ACCOUNT

Set these NON-SECRET GitHub staging environment variables exactly:
GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_SERVICE_ACCOUNT_EMAIL
STAGING_FUNCTIONS_BASE_URL=https://us-central1-urai-staging.cloudfunctions.net
EOF

if [ -z "$TWILIO_ENABLED_VERSION" ]; then
  echo 'HUMAN-ACTION-BLOCKED: TWILIO_AUTH_TOKEN has no enabled staging version; exact callback deployment binds this secret.' >&2
  exit 9
fi
