#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_PROJECT_ID="urai-staging"
EXPECTED_HOSTING_SITE="urai-staging"
EXPECTED_STAGING_URL="https://urai-staging.web.app"
EXPECTED_CONFIRMATION="DEPLOY_URAI_STAGING"
EXPECTED_AUTHORITY_SCOPE="urai-staging-repository-only"
DEPLOY_DIR="artifacts/deploy"
SITE_LIST_FILE="$DEPLOY_DIR/firebase-hosting-sites.json"
DEPLOY_LOG_FILE="$DEPLOY_DIR/firebase-deploy.log"
MUTATION_RECEIPT="$DEPLOY_DIR/staging-mutation-receipt.json"
FUNCTIONS_ENV_FILE="functions/.env"
FAILURE_REPORT="URAI_STAGING_LOCK_FAILED.md"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID is required}"
: "${URAI_RELEASE_CANDIDATE_SHA:?URAI_RELEASE_CANDIDATE_SHA is required}"
: "${URAI_STAGING_ROLLBACK_SHA:?URAI_STAGING_ROLLBACK_SHA is required}"
: "${URAI_STAGING_PREFLIGHT_VERIFIED:?URAI_STAGING_PREFLIGHT_VERIFIED is required}"
: "${URAI_STAGING_AUTHORITY_SCOPE:?URAI_STAGING_AUTHORITY_SCOPE is required}"
: "${URAI_STAGING_CONSUMER_ASSIGNMENTS_JSON:?URAI_STAGING_CONSUMER_ASSIGNMENTS_JSON is required}"
: "${URAI_FIREBASE_CLI_VERSION:?URAI_FIREBASE_CLI_VERSION is required}"
: "${GOOGLE_APPLICATION_CREDENTIALS:?GOOGLE_APPLICATION_CREDENTIALS is required}"

RELEASE_SHA="$URAI_RELEASE_CANDIDATE_SHA"
ROLLBACK_SHA="$URAI_STAGING_ROLLBACK_SHA"
DEPLOYED_AT="${URAI_DEPLOYED_AT:-$STARTED_AT}"
sha_pattern='^[0-9a-f]{40}$'

mkdir -p "$DEPLOY_DIR"

cleanup() {
  rm -f "$FUNCTIONS_ENV_FILE"
}

on_error() {
  local exit_code=$?
  {
    echo "# URAI Staging Lock Failed"
    echo
    echo "- Exit code: $exit_code"
    echo "- Firebase project: $EXPECTED_PROJECT_ID"
    echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
    echo "- Staging URL: $EXPECTED_STAGING_URL"
    echo "- Release candidate SHA: $RELEASE_SHA"
    echo "- Approved rollback SHA: $ROLLBACK_SHA"
    echo "- Failed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "The mutation phase did not produce release certification."
  } > "$FAILURE_REPORT"
  cleanup
  echo "[URAI staging] FAILED with exit code $exit_code. Wrote $FAILURE_REPORT" >&2
  exit "$exit_code"
}
trap on_error ERR
trap cleanup EXIT

step() {
  echo "[URAI staging] $1"
}

step "Verifying exact source, rollback, and repository-only authority"
[[ "$RELEASE_SHA" =~ $sha_pattern ]] || { echo "URAI_RELEASE_CANDIDATE_SHA must be a full lowercase SHA" >&2; exit 1; }
[[ "$ROLLBACK_SHA" =~ $sha_pattern ]] || { echo "URAI_STAGING_ROLLBACK_SHA must be a full lowercase SHA" >&2; exit 1; }
[ "$RELEASE_SHA" != "$ROLLBACK_SHA" ] || { echo "Release and rollback SHAs must differ" >&2; exit 1; }
[ "$(git rev-parse HEAD)" = "$RELEASE_SHA" ] || { echo "Checked-out SHA does not match release candidate" >&2; exit 1; }
git cat-file -e "${ROLLBACK_SHA}^{commit}"
git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA" || { echo "Rollback SHA must be an ancestor" >&2; exit 1; }

[ "$FIREBASE_PROJECT_ID" = "$EXPECTED_PROJECT_ID" ] || { echo "FIREBASE_PROJECT_ID must be $EXPECTED_PROJECT_ID" >&2; exit 1; }
[ "${URAI_STAGING_PROJECT_ID:-$EXPECTED_PROJECT_ID}" = "$EXPECTED_PROJECT_ID" ] || { echo "URAI_STAGING_PROJECT_ID must be $EXPECTED_PROJECT_ID" >&2; exit 1; }
[ "${URAI_STAGING_DEPLOY_CONFIRM:-}" = "$EXPECTED_CONFIRMATION" ] || { echo "Set URAI_STAGING_DEPLOY_CONFIRM=$EXPECTED_CONFIRMATION" >&2; exit 1; }
[ "$URAI_STAGING_PREFLIGHT_VERIFIED" = "1" ] || { echo "Credential-free preflight verification is required" >&2; exit 1; }
[ "$URAI_STAGING_AUTHORITY_SCOPE" = "$EXPECTED_AUTHORITY_SCOPE" ] || { echo "Shared staging authority scope is invalid" >&2; exit 1; }
[ "${URAI_PRODUCTION_DEPLOY_APPROVED:-0}" = "0" ] || { echo "Production approval must remain disabled" >&2; exit 1; }
[ "${ALLOW_CREATE_STAGING_HOSTING_SITE:-0}" = "0" ] || { echo "Infrastructure creation is forbidden" >&2; exit 1; }

node - <<'NODE'
const assignments = JSON.parse(process.env.URAI_STAGING_CONSUMER_ASSIGNMENTS_JSON || 'null');
if (!Array.isArray(assignments) || assignments.length !== 0) {
  throw new Error('Canonical urai-staging deploy cannot authorize consumer-system mutations.');
}
NODE

test -f "$GOOGLE_APPLICATION_CREDENTIALS"
node -e '
  const fs = require("fs");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error("Service-account project mismatch");
'
command -v firebase >/dev/null 2>&1 || { echo "firebase CLI is required" >&2; exit 1; }
[ "$(firebase --version)" = "$URAI_FIREBASE_CLI_VERSION" ] || { echo "Firebase CLI version drift" >&2; exit 1; }

step "Verifying materialized prebuilt artifact"
node scripts/staging-prebuilt-manifest.mjs --verify-materialized

cat > "$FUNCTIONS_ENV_FILE" <<EOF
URAI_RELEASE_CANDIDATE_SHA=$RELEASE_SHA
URAI_DEPLOYED_AT=$DEPLOYED_AT
EOF

step "Verifying existing Firebase Hosting site"
rm -f "$SITE_LIST_FILE"
firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" --json > "$SITE_LIST_FILE"
node - "$SITE_LIST_FILE" "$EXPECTED_HOSTING_SITE" <<'NODE'
const fs = require('node:fs');
const [file, expectedSite] = process.argv.slice(2);
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
const strings = [];
(function collect(value) {
  if (typeof value === 'string') strings.push(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
})(document);
const exact = strings.some((value) => value === expectedSite || value.endsWith(`/sites/${expectedSite}`));
if (!exact) throw new Error(`Hosting site ${expectedSite} was not found as an exact provider identity.`);
NODE

step "Deploying verified staging artifact"
rm -f "$DEPLOY_LOG_FILE"
set +e
firebase deploy \
  --only hosting:"$EXPECTED_HOSTING_SITE",functions,firestore:rules,firestore:indexes,storage \
  --project "$EXPECTED_PROJECT_ID" \
  --non-interactive 2>&1 | tee "$DEPLOY_LOG_FILE"
DEPLOY_STATUS=${PIPESTATUS[0]}
set -e

DEPLOY_LOG_SHA256="$(node -e 'const fs=require("fs"),c=require("crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$DEPLOY_LOG_FILE")"
FUNCTIONS_ENV_SHA256="$(node -e 'const fs=require("fs"),c=require("crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$FUNCTIONS_ENV_FILE")"

DEPLOY_STATUS="$DEPLOY_STATUS" \
DEPLOY_LOG_SHA256="$DEPLOY_LOG_SHA256" \
FUNCTIONS_ENV_SHA256="$FUNCTIONS_ENV_SHA256" \
STARTED_AT="$STARTED_AT" \
DEPLOYED_AT="$DEPLOYED_AT" \
MUTATION_RECEIPT="$MUTATION_RECEIPT" node <<'NODE'
const fs = require('node:fs');
const receipt = {
  schemaVersion: 'urai-staging-mutation-1',
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-staging',
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  sourceSha: process.env.URAI_RELEASE_CANDIDATE_SHA,
  rollbackSha: process.env.URAI_STAGING_ROLLBACK_SHA,
  projectId: process.env.FIREBASE_PROJECT_ID,
  hostingSite: 'urai-staging',
  hostingUrl: 'https://urai-staging.web.app',
  authorityScope: process.env.URAI_STAGING_AUTHORITY_SCOPE,
  consumerAssignments: JSON.parse(process.env.URAI_STAGING_CONSUMER_ASSIGNMENTS_JSON),
  crossSystemMutationAuthorized: false,
  startedAt: process.env.STARTED_AT,
  deployedAt: process.env.DEPLOYED_AT,
  firebaseCliVersion: process.env.URAI_FIREBASE_CLI_VERSION,
  deployExitCode: Number(process.env.DEPLOY_STATUS),
  deploymentCommandCompleted: process.env.DEPLOY_STATUS === '0',
  deployLogSha256: process.env.DEPLOY_LOG_SHA256,
  functionsEnvSha256: process.env.FUNCTIONS_ENV_SHA256,
  secretValuesIncluded: false,
  publicVerificationCompleted: false,
};
fs.writeFileSync(process.env.MUTATION_RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
NODE

[ "$DEPLOY_STATUS" -eq 0 ] || { echo "Firebase staging deployment failed" >&2; exit "$DEPLOY_STATUS"; }
rm -f "$FAILURE_REPORT"
step "Staging mutation completed; public verification remains required"
