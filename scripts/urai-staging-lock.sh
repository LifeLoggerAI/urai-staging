#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_PROJECT_ID="urai-staging"
EXPECTED_HOSTING_SITE="urai-staging"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging.web.app}"
: "${URAI_RELEASE_CANDIDATE_SHA:?URAI_RELEASE_CANDIDATE_SHA is required}"
: "${URAI_STAGING_ROLLBACK_SHA:?URAI_STAGING_ROLLBACK_SHA is required}"
RELEASE_SHA="$URAI_RELEASE_CANDIDATE_SHA"
ROLLBACK_SHA="$URAI_STAGING_ROLLBACK_SHA"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FAILURE_REPORT="URAI_STAGING_LOCK_FAILED.md"
DEPLOY_DIR="artifacts/deploy"
SITE_LIST_FILE="$DEPLOY_DIR/firebase-hosting-sites.json"
DEPLOY_LOG_FILE="$DEPLOY_DIR/firebase-deploy.log"
sha_pattern='^[0-9a-f]{40}$'

mkdir -p "$DEPLOY_DIR"

step() {
  echo "[URAI staging] $1"
}

on_error() {
  local exit_code=$?
  {
    echo "# URAI Staging Lock Failed"
    echo ""
    echo "- Exit code: $exit_code"
    echo "- Firebase project: $EXPECTED_PROJECT_ID"
    echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
    echo "- Staging URL: $STAGING_URL"
    echo "- Release candidate SHA: $RELEASE_SHA"
    echo "- Approved rollback SHA: $ROLLBACK_SHA"
    echo "- Failed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "Run again with: bash -x scripts/urai-staging-lock.sh"
  } > "$FAILURE_REPORT"
  echo "[URAI staging] FAILED with exit code $exit_code. Wrote $FAILURE_REPORT" >&2
  exit "$exit_code"
}
trap on_error ERR

step "Verifying exact source and rollback authority"
[[ "$RELEASE_SHA" =~ $sha_pattern ]] || {
  echo "URAI_RELEASE_CANDIDATE_SHA must be a full lowercase 40-character SHA" >&2
  exit 1
}
[[ "$ROLLBACK_SHA" =~ $sha_pattern ]] || {
  echo "URAI_STAGING_ROLLBACK_SHA must be a full lowercase 40-character SHA" >&2
  exit 1
}
ACTUAL_SHA="$(git rev-parse HEAD)"
[ "$ACTUAL_SHA" = "$RELEASE_SHA" ] || {
  echo "Checked-out SHA $ACTUAL_SHA does not match release candidate $RELEASE_SHA" >&2
  exit 1
}
[ "$RELEASE_SHA" != "$ROLLBACK_SHA" ] || {
  echo "Release candidate and rollback SHA must differ" >&2
  exit 1
}
git cat-file -e "${ROLLBACK_SHA}^{commit}"
git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA" || {
  echo "Rollback SHA must be an ancestor of the release candidate" >&2
  exit 1
}
[ -z "$(git status --porcelain --untracked-files=all)" ] || {
  echo "Staging deploy requires a clean exact checkout" >&2
  git status --short >&2
  exit 1
}

step "Starting lock for project $EXPECTED_PROJECT_ID"
if [ "${URAI_STAGING_PROJECT_ID:-$EXPECTED_PROJECT_ID}" != "$EXPECTED_PROJECT_ID" ]; then
  echo "Refusing deploy: URAI_STAGING_PROJECT_ID must be $EXPECTED_PROJECT_ID" >&2
  exit 1
fi
if [ "${URAI_PRODUCTION_DEPLOY_APPROVED:-0}" = "1" ]; then
  echo "Refusing staging deploy while production approval flag is enabled." >&2
  exit 1
fi
if [ "${ALLOW_CREATE_STAGING_HOSTING_SITE:-0}" != "0" ]; then
  echo "Refusing deploy: canonical staging deployment cannot create Hosting infrastructure." >&2
  exit 1
fi
command -v firebase >/dev/null 2>&1 || {
  echo "firebase CLI is required for deploy." >&2
  exit 1
}

step "Verifying existing Firebase Hosting site with exact JSON identity"
rm -f "$SITE_LIST_FILE"
firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" --json > "$SITE_LIST_FILE"
node - "$SITE_LIST_FILE" "$EXPECTED_HOSTING_SITE" <<'NODE'
const fs = require('node:fs');
const [path, expectedSite] = process.argv.slice(2);
const document = JSON.parse(fs.readFileSync(path, 'utf8'));
const strings = [];
function collect(value) {
  if (typeof value === 'string') strings.push(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
collect(document);
const exact = strings.some((value) => value === expectedSite || value.endsWith(`/sites/${expectedSite}`));
if (!exact) {
  console.error(`Hosting site ${expectedSite} was not found as an exact provider identity.`);
  process.exit(1);
}
console.log(`Verified existing Hosting site ${expectedSite}.`);
NODE

step "Installing function dependencies"
npm --prefix functions ci

step "Running deploy readiness check"
npm run check:deploy

step "Running lockfile check"
npm run check:lockfile

step "Running lint"
npm run lint

step "Running typecheck"
npm run typecheck

step "Running build"
npm run build

step "Running unit tests"
npm run test:unit

step "Running emulator-backed e2e tests"
npm run test:e2e

step "Deploying Hosting, Functions, Firestore, and Storage to staging"
rm -f "$DEPLOY_LOG_FILE"
URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" \
URAI_STAGING_ROLLBACK_SHA="$ROLLBACK_SHA" \
URAI_DEPLOYED_AT="$DEPLOYED_AT" \
firebase deploy \
  --only hosting:"$EXPECTED_HOSTING_SITE",functions,firestore:rules,firestore:indexes,storage \
  --project "$EXPECTED_PROJECT_ID" \
  --non-interactive 2>&1 | tee "$DEPLOY_LOG_FILE"
DEPLOY_LOG_SHA256="$(sha256sum "$DEPLOY_LOG_FILE" | awk '{print $1}')"

step "Running non-mutating live smoke with exact runtime identity"
URAI_STAGING_PROJECT_ID="$EXPECTED_PROJECT_ID" \
URAI_STAGING_URL="$STAGING_URL" \
URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" \
bash scripts/smoke-staging.sh

step "Writing URAI_STAGING_LOCK.md"
{
  echo "# URAI Staging Lock"
  echo ""
  echo "Status: Staging deployment completed; exact runtime build-info identity and non-mutating live smoke passed."
  echo ""
  echo "- Firebase project: $EXPECTED_PROJECT_ID"
  echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
  echo "- Staging URL: $STAGING_URL"
  echo "- Exact tested source SHA: $RELEASE_SHA"
  echo "- Runtime-reported release SHA: $RELEASE_SHA"
  echo "- Approved ancestor rollback source SHA: $ROLLBACK_SHA"
  echo "- Deploy log SHA-256: $DEPLOY_LOG_SHA256"
  echo "- Deployed at: $DEPLOYED_AT"
  echo "- Canonical repo: LifeLoggerAI/urai-staging"
  echo "- Deploy command: npm run deploy:staging"
  echo "- Smoke command: npm run smoke:staging"
  echo ""
  echo "## Evidence captured"
  echo ""
  echo "- Clean exact checkout and rollback ancestry"
  echo "- Existing Hosting site exact provider identity; no infrastructure creation"
  echo "- Dependency install, readiness, lockfile, lint, typecheck, build and unit tests"
  echo "- Emulator-backed e2e/rules tests"
  echo "- Firebase deploy command output with immutable log digest"
  echo "- Exact /api/buildinfo source-SHA and deployment-timestamp match"
  echo "- Non-mutating live checks for /, /u/adamclamp, robots, health, buildinfo, companion validation and waitlist validation"
  echo ""
  echo "## Not included"
  echo ""
  echo "- Production deployment"
  echo "- Production credentials or data"
  echo "- Live companion or waitlist write proof; those require a separately authorized mutation test"
  echo "- Independent proof that the approved rollback SHA is the currently deployed prior provider revision"
  echo "- Independent provider API mapping from source SHA to every deployed Functions revision"
} > URAI_STAGING_LOCK.md

rm -f "$FAILURE_REPORT"
step "URAI staging lock completed for $EXPECTED_PROJECT_ID at $STAGING_URL"