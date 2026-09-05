#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_PROJECT_ID='urai-staging'
EXPECTED_ENVIRONMENT='staging'
EXPECTED_ADMIN_REPOSITORY='LifeLoggerAI/urai-admin'
EXPECTED_ADMIN_PR='57'
EXPECTED_CONSUMER_ID='urai-admin-pr57-runtime-closure'
EXPECTED_HOSTING_SITE='urai-staging'
EXPECTED_CANONICAL_STAGING_URL='https://urai-staging.web.app'
FIREBASE_CLI_VERSION='15.23.0'

: "${ADMIN_SHA:?ADMIN_SHA is required}"
: "${CONTROLLER_SHA:?CONTROLLER_SHA is required}"
: "${ADMIN_SOURCE_DIR:?ADMIN_SOURCE_DIR is required}"
: "${PREBUILT_ROOT:?PREBUILT_ROOT is required}"
: "${DEPLOY_ROOT:?DEPLOY_ROOT is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
: "${GOOGLE_APPLICATION_CREDENTIALS:?GOOGLE_APPLICATION_CREDENTIALS is required}"
: "${GOOGLE_GHA_CREDS_PATH:?GOOGLE_GHA_CREDS_PATH is required}"

EXPECTED_EXISTING_ADMIN_SHA="${EXPECTED_EXISTING_ADMIN_SHA:-}"
CHANNEL_ID="admin-pr57-${ADMIN_SHA:0:12}"
RECEIPT_DIR="$GITHUB_WORKSPACE/artifacts/admin-pr57-runtime"
RECEIPT_FILE="$RECEIPT_DIR/runtime-deploy.json"
PROVIDER_PRE_FILE="$RECEIPT_DIR/provider-pre.json"
PROVIDER_POST_FILE="$RECEIPT_DIR/provider-post.json"
PLACEHOLDER_RESULT="$RECEIPT_DIR/hosting-placeholder.json"
FINAL_HOSTING_RESULT="$RECEIPT_DIR/hosting-final.json"
FUNCTION_DEPLOY_LOG="$RECEIPT_DIR/function-deploy.log"

cleanup() {
  rm -rf -- "$DEPLOY_ROOT"
}
trap cleanup EXIT

fail() {
  echo "[Admin PR57 staging lock] $*" >&2
  exit 1
}

[[ "$ADMIN_SHA" =~ ^[0-9a-f]{40}$ ]] || fail 'ADMIN_SHA must be a full lowercase SHA'
[[ "$CONTROLLER_SHA" =~ ^[0-9a-f]{40}$ ]] || fail 'CONTROLLER_SHA must be a full lowercase SHA'
if [ -n "$EXPECTED_EXISTING_ADMIN_SHA" ]; then
  [[ "$EXPECTED_EXISTING_ADMIN_SHA" =~ ^[0-9a-f]{40}$ ]] || fail 'EXPECTED_EXISTING_ADMIN_SHA must be empty or a full lowercase SHA'
  [ "$EXPECTED_EXISTING_ADMIN_SHA" != "$ADMIN_SHA" ] || fail 'Existing Admin SHA must differ from target Admin SHA for an update/rollback transition'
fi

[ "${GITHUB_ACTIONS:-false}" = 'true' ] || fail 'GitHub Actions authority is required'
[ "${GITHUB_REF:-}" = 'refs/heads/main' ] || fail 'Consumer mutation is allowed only from refs/heads/main'
[ "${GITHUB_SHA:-}" = "$CONTROLLER_SHA" ] || fail 'Workflow SHA does not match controller SHA'
[ "$(git rev-parse HEAD)" = "$CONTROLLER_SHA" ] || fail 'Checked-out staging SHA does not match controller SHA'
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Staging controller checkout is dirty'
remote_controller_sha="$(git ls-remote --exit-code origin refs/heads/main | awk '{print $1}')"
[ "$remote_controller_sha" = "$CONTROLLER_SHA" ] || fail 'Controller is not unchanged current staging main'

[ "$(git -C "$ADMIN_SOURCE_DIR" rev-parse HEAD)" = "$ADMIN_SHA" ] || fail 'Admin checkout SHA mismatch'
[ -z "$(git -C "$ADMIN_SOURCE_DIR" status --porcelain --untracked-files=all)" ] || fail 'Admin checkout is dirty'
live_admin_sha="$(git ls-remote --exit-code https://github.com/LifeLoggerAI/urai-admin.git refs/pull/57/head | awk '{print $1}')"
[ "$live_admin_sha" = "$ADMIN_SHA" ] || fail 'Admin PR #57 moved from the authorized exact SHA'

[ "${STAGING_PROJECT_ID:-}" = "$EXPECTED_PROJECT_ID" ] || fail 'Wrong staging project'
[ "${EXPECTED_ENVIRONMENT_NAME:-}" = "$EXPECTED_ENVIRONMENT" ] || fail 'Wrong staging environment'
[ "${URAI_PRODUCTION_DEPLOY_APPROVED:-0}" = '0' ] || fail 'Production authority must remain disabled'
[ -z "${FIREBASE_TOKEN:-}" ] || fail 'FIREBASE_TOKEN is prohibited'
[ -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}" ] || fail 'Raw Firebase service-account keys are prohibited'
[ -z "${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}" ] || fail 'Raw service-account JSON is prohibited'
[ "$GOOGLE_APPLICATION_CREDENTIALS" = "$GOOGLE_GHA_CREDS_PATH" ] || fail 'ADC path must match google-github-actions WIF path'
case "$GOOGLE_APPLICATION_CREDENTIALS" in
  "$GITHUB_WORKSPACE"/gha-creds-*.json) ;;
  *) fail 'ADC must be the ephemeral google-github-actions credential under GITHUB_WORKSPACE' ;;
esac
[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ] || fail 'Ephemeral ADC file is missing'
git check-ignore -q "$GOOGLE_APPLICATION_CREDENTIALS" || fail 'Ephemeral ADC path must be gitignored'

ADMIN_SHA="$ADMIN_SHA" node <<'NODE'
const fs = require('node:fs');
const authority = JSON.parse(fs.readFileSync('config/staging-consumers.json', 'utf8'));
const c = authority.consumers.find((entry) => entry.id === 'urai-admin-pr57-runtime-closure');
const failures = [];
if (authority.projectId !== 'urai-staging') failures.push('project');
if (authority.environment !== 'staging') failures.push('environment');
if (authority.mutationAuthorityRepository !== 'LifeLoggerAI/urai-staging') failures.push('mutation authority');
if (authority.productionAllowed !== false) failures.push('production allowed');
if (!c) failures.push('consumer missing');
if (c) {
  if (c.repository !== 'LifeLoggerAI/urai-admin' || c.repositoryId !== 1150887043 || c.pullRequest !== 57) failures.push('Admin identity');
  if (c.exactSha !== process.env.ADMIN_SHA || c.sourceRef !== 'refs/pull/57/head') failures.push('Admin exact SHA/ref');
  if (c.mode !== 'synthetic-runtime-validation' || c.dataPolicy !== 'synthetic-only') failures.push('synthetic policy');
  if (c.providerProject !== 'urai-staging' || c.allowedEnvironment !== 'staging') failures.push('provider scope');
  if (!Array.isArray(c.allowedDeployScopes) || !c.allowedDeployScopes.includes('functions-explicit-only') || !c.allowedDeployScopes.includes('hosting-preview-only')) failures.push('deploy scopes');
  if (c.projectWideRuleMutationAuthorized !== false) failures.push('project-wide rule mutation');
  if (c.productionDeploymentAuthorized !== false || c.productionDataAuthorized !== false) failures.push('production authority');
  if (c.longLivedCredentialsAuthorized !== false) failures.push('long-lived credentials');
}
if (failures.length) throw new Error(`Admin staging consumer authority mismatch: ${failures.join(', ')}`);
NODE

command -v gcloud >/dev/null 2>&1 || fail 'gcloud is required'
command -v firebase >/dev/null 2>&1 || fail 'firebase CLI is required'
[ "$(firebase --version)" = "$FIREBASE_CLI_VERSION" ] || fail 'Firebase CLI version drift'
active_principal="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[ -n "$active_principal" ] || fail 'No active Google principal'
[ "$active_principal" = "${DEPLOY_SERVICE_ACCOUNT:-}" ] || fail 'Active Google principal is not the protected staging deploy service account'
gcloud projects describe "$EXPECTED_PROJECT_ID" --format='value(projectId)' | grep -qx "$EXPECTED_PROJECT_ID" || fail 'Google project readback mismatch'

mkdir -p "$RECEIPT_DIR"
rm -rf -- "$DEPLOY_ROOT"
mkdir -p "$DEPLOY_ROOT/functions" "$DEPLOY_ROOT/hosting-placeholder" "$DEPLOY_ROOT/hosting-rewrite"

[ -d "$PREBUILT_ROOT/functions/lib" ] || fail 'Prebuilt Functions lib is missing'
[ -d "$PREBUILT_ROOT/functions/apps/urai-admin" ] || fail 'Packaged Admin Next app is missing from prebuilt artifact'
[ -f "$PREBUILT_ROOT/functions/package.json" ] || fail 'Prebuilt Functions package.json is missing'
cp -a "$PREBUILT_ROOT/functions/." "$DEPLOY_ROOT/functions/"
rm -rf -- "$DEPLOY_ROOT/functions/node_modules"
printf '%s\n' 'Admin PR57 staging preview is being prepared.' > "$DEPLOY_ROOT/hosting-placeholder/index.html"

# Capture provider state before mutation. Never serialize token material.
gcloud functions list --project="$EXPECTED_PROJECT_ID" --format=json > "$PROVIDER_PRE_FILE"

ADMIN_SHA="$ADMIN_SHA" EXPECTED_EXISTING_ADMIN_SHA="$EXPECTED_EXISTING_ADMIN_SHA" PROVIDER_PRE_FILE="$PROVIDER_PRE_FILE" node <<'NODE'
const fs = require('node:fs');
const functions = JSON.parse(fs.readFileSync(process.env.PROVIDER_PRE_FILE, 'utf8'));
const matches = Array.isArray(functions) ? functions.filter((fn) => {
  const name = String(fn.name || '');
  return name === 'nextServer' || name.endsWith('/functions/nextServer');
}) : [];
if (matches.length > 1) throw new Error('Multiple provider functions named nextServer exist; refusing collision');
const existing = matches[0] || null;
if (!existing) {
  if (process.env.EXPECTED_EXISTING_ADMIN_SHA) throw new Error('Expected an existing managed Admin function, but nextServer is absent');
  process.exit(0);
}
if (!process.env.EXPECTED_EXISTING_ADMIN_SHA) throw new Error('Pre-existing nextServer is not authorized for replacement');
const region = String(existing.region || existing.location || existing.name || '').split('/locations/')[1]?.split('/')[0] || 'us-central1';
fs.writeFileSync(process.env.PROVIDER_PRE_FILE + '.existing.json', JSON.stringify({ region, environment: existing.environment || null }, null, 2));
NODE

if [ -f "$PROVIDER_PRE_FILE.existing.json" ]; then
  existing_region="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).region" "$PROVIDER_PRE_FILE.existing.json")"
  set +e
  gcloud functions describe nextServer --project="$EXPECTED_PROJECT_ID" --region="$existing_region" --format=json > "$PROVIDER_PRE_FILE.describe" 2>/dev/null
  describe_status=$?
  if [ "$describe_status" -ne 0 ]; then
    gcloud functions describe nextServer --gen2 --project="$EXPECTED_PROJECT_ID" --region="$existing_region" --format=json > "$PROVIDER_PRE_FILE.describe" 2>/dev/null
    describe_status=$?
  fi
  set -e
  [ "$describe_status" -eq 0 ] || fail 'Could not independently describe existing nextServer ownership'
  EXPECTED_EXISTING_ADMIN_SHA="$EXPECTED_EXISTING_ADMIN_SHA" PROVIDER_DESCRIBE="$PROVIDER_PRE_FILE.describe" node <<'NODE'
const fs = require('node:fs');
const fn = JSON.parse(fs.readFileSync(process.env.PROVIDER_DESCRIBE, 'utf8'));
const env = fn.environmentVariables || fn.serviceConfig?.environmentVariables || {};
if (env.URAI_ADMIN_CONSUMER_ID !== 'urai-admin-pr57-runtime-closure') throw new Error('Existing nextServer is not marked as the governed Admin consumer');
if (env.URAI_ADMIN_SOURCE_SHA !== process.env.EXPECTED_EXISTING_ADMIN_SHA) throw new Error('Existing nextServer SHA marker does not match the explicitly expected prior Admin SHA');
if (env.URAI_PRODUCTION_DEPLOY_APPROVED !== '0') throw new Error('Existing nextServer does not prove production authority disabled');
NODE
fi
rm -f -- "$PROVIDER_PRE_FILE.existing.json" "$PROVIDER_PRE_FILE.describe"

cat > "$DEPLOY_ROOT/firebase-placeholder.json" <<EOF
{
  "hosting": {
    "site": "$EXPECTED_HOSTING_SITE",
    "public": "hosting-placeholder",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
EOF

# First create a short-lived placeholder preview to obtain the provider-generated exact URL.
(
  cd "$DEPLOY_ROOT"
  firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "$EXPECTED_PROJECT_ID" \
    --config firebase-placeholder.json \
    --expires 1d \
    --non-interactive \
    --json > "$PLACEHOLDER_RESULT"
)

PREVIEW_URL="$(PLACEHOLDER_RESULT="$PLACEHOLDER_RESULT" node <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.env.PLACEHOLDER_RESULT, 'utf8'));
const strings = [];
(function collect(v) {
  if (typeof v === 'string') strings.push(v);
  else if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') Object.values(v).forEach(collect);
})(payload);
const url = strings.find((value) => /^https:\/\/urai-staging--[a-z0-9-]+\.web\.app\/?$/i.test(value));
if (!url) throw new Error('Could not identify exact urai-staging Hosting preview URL');
process.stdout.write(url.replace(/\/$/, ''));
NODE
)"
[ -n "$PREVIEW_URL" ] || fail 'Preview URL is empty'

cat > "$DEPLOY_ROOT/functions/.env.urai-staging" <<EOF
URAI_ADMIN_PRODUCTION_URL=$PREVIEW_URL
URAI_ADMIN_ALLOWED_ORIGINS=$PREVIEW_URL,$EXPECTED_CANONICAL_STAGING_URL
URAI_ADMIN_CONSUMER_ID=$EXPECTED_CONSUMER_ID
URAI_ADMIN_SOURCE_SHA=$ADMIN_SHA
URAI_STAGING_CONTROLLER_SHA=$CONTROLLER_SHA
URAI_PRODUCTION_DEPLOY_APPROVED=0
EOF

cat > "$DEPLOY_ROOT/firebase-functions.json" <<'EOF'
{
  "functions": [
    {
      "source": "functions",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
      "runtime": "nodejs20"
    }
  ]
}
EOF

# Deploy only the Admin HTTPS server. Scheduled analytics and shared rules are intentionally excluded.
set +e
(
  cd "$DEPLOY_ROOT"
  firebase deploy \
    --only functions:nextServer \
    --project "$EXPECTED_PROJECT_ID" \
    --config firebase-functions.json \
    --non-interactive
) 2>&1 | tee "$FUNCTION_DEPLOY_LOG"
function_status=${PIPESTATUS[0]}
set -e
[ "$function_status" -eq 0 ] || fail 'Exact nextServer staging deployment failed'

# Independently read back the deployed function and exact non-secret ownership markers.
gcloud functions list --project="$EXPECTED_PROJECT_ID" --format=json > "$PROVIDER_POST_FILE"
ADMIN_SHA="$ADMIN_SHA" CONTROLLER_SHA="$CONTROLLER_SHA" PROVIDER_POST_FILE="$PROVIDER_POST_FILE" node <<'NODE'
const fs = require('node:fs');
const functions = JSON.parse(fs.readFileSync(process.env.PROVIDER_POST_FILE, 'utf8'));
const matches = Array.isArray(functions) ? functions.filter((fn) => {
  const name = String(fn.name || '');
  return name === 'nextServer' || name.endsWith('/functions/nextServer');
}) : [];
if (matches.length !== 1) throw new Error(`Expected exactly one nextServer after deploy; found ${matches.length}`);
const fn = matches[0];
const region = String(fn.region || fn.location || fn.name || '').split('/locations/')[1]?.split('/')[0] || 'us-central1';
fs.writeFileSync(process.env.PROVIDER_POST_FILE + '.target.json', JSON.stringify({ region, environment: fn.environment || null }, null, 2));
NODE
post_region="$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).region" "$PROVIDER_POST_FILE.target.json")"
set +e
gcloud functions describe nextServer --project="$EXPECTED_PROJECT_ID" --region="$post_region" --format=json > "$PROVIDER_POST_FILE.describe" 2>/dev/null
post_describe_status=$?
if [ "$post_describe_status" -ne 0 ]; then
  gcloud functions describe nextServer --gen2 --project="$EXPECTED_PROJECT_ID" --region="$post_region" --format=json > "$PROVIDER_POST_FILE.describe" 2>/dev/null
  post_describe_status=$?
fi
set -e
[ "$post_describe_status" -eq 0 ] || fail 'Could not independently describe deployed nextServer'
ADMIN_SHA="$ADMIN_SHA" CONTROLLER_SHA="$CONTROLLER_SHA" PROVIDER_DESCRIBE="$PROVIDER_POST_FILE.describe" PREVIEW_URL="$PREVIEW_URL" node <<'NODE'
const fs = require('node:fs');
const fn = JSON.parse(fs.readFileSync(process.env.PROVIDER_DESCRIBE, 'utf8'));
const env = fn.environmentVariables || fn.serviceConfig?.environmentVariables || {};
const failures = [];
if (env.URAI_ADMIN_CONSUMER_ID !== 'urai-admin-pr57-runtime-closure') failures.push('consumer marker');
if (env.URAI_ADMIN_SOURCE_SHA !== process.env.ADMIN_SHA) failures.push('Admin SHA marker');
if (env.URAI_STAGING_CONTROLLER_SHA !== process.env.CONTROLLER_SHA) failures.push('controller SHA marker');
if (env.URAI_PRODUCTION_DEPLOY_APPROVED !== '0') failures.push('production fence');
if (env.URAI_ADMIN_PRODUCTION_URL !== process.env.PREVIEW_URL) failures.push('preview origin');
if (failures.length) throw new Error(`Deployed nextServer provider readback mismatch: ${failures.join(', ')}`);
const selected = {
  name: fn.name || 'nextServer',
  region: String(fn.region || fn.location || fn.name || '').split('/locations/')[1]?.split('/')[0] || null,
  environment: fn.environment || null,
  status: fn.status || fn.state || null,
  updateTime: fn.updateTime || null,
  serviceAccountEmail: fn.serviceAccountEmail || fn.serviceConfig?.serviceAccountEmail || null,
  uri: fn.url || fn.serviceConfig?.uri || fn.httpsTrigger?.url || null,
  markers: {
    URAI_ADMIN_CONSUMER_ID: env.URAI_ADMIN_CONSUMER_ID,
    URAI_ADMIN_SOURCE_SHA: env.URAI_ADMIN_SOURCE_SHA,
    URAI_STAGING_CONTROLLER_SHA: env.URAI_STAGING_CONTROLLER_SHA,
    URAI_PRODUCTION_DEPLOY_APPROVED: env.URAI_PRODUCTION_DEPLOY_APPROVED,
    URAI_ADMIN_PRODUCTION_URL: env.URAI_ADMIN_PRODUCTION_URL,
  },
};
fs.writeFileSync(process.env.PROVIDER_DESCRIBE + '.selected', JSON.stringify(selected, null, 2));
NODE

cat > "$DEPLOY_ROOT/firebase-hosting.json" <<EOF
{
  "hosting": {
    "site": "$EXPECTED_HOSTING_SITE",
    "public": "hosting-rewrite",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "function": "nextServer"}]
  }
}
EOF

# Publish only the short-lived preview channel. The live channel remains untouched.
(
  cd "$DEPLOY_ROOT"
  firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "$EXPECTED_PROJECT_ID" \
    --config firebase-hosting.json \
    --expires 1d \
    --non-interactive \
    --json > "$FINAL_HOSTING_RESULT"
)

PREVIEW_URL="$PREVIEW_URL" FINAL_HOSTING_RESULT="$FINAL_HOSTING_RESULT" node <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.env.FINAL_HOSTING_RESULT, 'utf8'));
const strings = [];
(function collect(v) {
  if (typeof v === 'string') strings.push(v);
  else if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') Object.values(v).forEach(collect);
})(payload);
if (!strings.some((value) => value.replace(/\/$/, '') === process.env.PREVIEW_URL)) {
  throw new Error('Final Hosting preview did not read back the original exact preview URL');
}
NODE

ACTIVE_PRINCIPAL="$active_principal" ADMIN_SHA="$ADMIN_SHA" CONTROLLER_SHA="$CONTROLLER_SHA" PREVIEW_URL="$PREVIEW_URL" CHANNEL_ID="$CHANNEL_ID" EXPECTED_EXISTING_ADMIN_SHA="$EXPECTED_EXISTING_ADMIN_SHA" PROVIDER_SELECTED="$PROVIDER_POST_FILE.describe.selected" RECEIPT_FILE="$RECEIPT_FILE" node <<'NODE'
const fs = require('node:fs');
const provider = JSON.parse(fs.readFileSync(process.env.PROVIDER_SELECTED, 'utf8'));
const receipt = {
  schemaVersion: 'urai-admin-pr57-staging-runtime-deploy-1',
  generatedAt: new Date().toISOString(),
  stagingRepository: process.env.GITHUB_REPOSITORY,
  stagingControllerSha: process.env.CONTROLLER_SHA,
  adminRepository: 'LifeLoggerAI/urai-admin',
  adminPullRequest: 57,
  adminCandidateSha: process.env.ADMIN_SHA,
  expectedExistingAdminSha: process.env.EXPECTED_EXISTING_ADMIN_SHA || null,
  projectId: 'urai-staging',
  environment: 'staging',
  authenticatedGooglePrincipal: process.env.ACTIVE_PRINCIPAL,
  credentialClass: 'GitHub OIDC + WIF + ephemeral ADC',
  hostingSite: 'urai-staging',
  hostingChannel: process.env.CHANNEL_ID,
  hostingPreviewUrl: process.env.PREVIEW_URL,
  hostingLiveChannelMutated: false,
  explicitFunctionDeployed: 'nextServer',
  scheduledAnalyticsDeployed: false,
  projectWideFirestoreRulesMutated: false,
  projectWideStorageRulesMutated: false,
  productionDeploymentPerformed: false,
  productionDataAuthorized: false,
  providerFunctionReadback: provider,
  secretValuesIncluded: false,
};
fs.writeFileSync(process.env.RECEIPT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
NODE

rm -f -- "$PROVIDER_POST_FILE.target.json" "$PROVIDER_POST_FILE.describe" "$PROVIDER_POST_FILE.describe.selected"
rm -f -- "$DEPLOY_ROOT/functions/.env.urai-staging"
echo "ADMIN_PR57_STAGING_RUNTIME_DEPLOY_OK preview=$PREVIEW_URL admin_sha=$ADMIN_SHA controller_sha=$CONTROLLER_SHA"
