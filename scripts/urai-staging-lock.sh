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
sha_pattern='^[0-9a-f]{40}$'

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

step "Selecting Firebase project"
firebase use "$EXPECTED_PROJECT_ID"

step "Verifying existing Firebase Hosting site"
SITE_LIST_FILE="$(mktemp)"
trap 'rm -f "$SITE_LIST_FILE"' EXIT
firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" > "$SITE_LIST_FILE"
cat "$SITE_LIST_FILE"
grep -q "$EXPECTED_HOSTING_SITE" "$SITE_LIST_FILE" || {
  echo "Hosting site $EXPECTED_HOSTING_SITE does not exist in $EXPECTED_PROJECT_ID." >&2
  echo "Refusing to create billable or externally visible infrastructure from the deploy lock." >&2
  exit 1
}
rm -f "$SITE_LIST_FILE"
trap - EXIT
trap on_error ERR

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
URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" \
URAI_STAGING_ROLLBACK_SHA="$ROLLBACK_SHA" \
URAI_DEPLOYED_AT="$DEPLOYED_AT" \
firebase deploy \
  --only hosting:"$EXPECTED_HOSTING_SITE",functions,firestore:rules,firestore:indexes,storage \
  --project "$EXPECTED_PROJECT_ID" \
  --non-interactive

step "Running live smoke tests"
URAI_STAGING_PROJECT_ID="$EXPECTED_PROJECT_ID" URAI_STAGING_URL="$STAGING_URL" bash scripts/smoke-staging.sh

step "Writing URAI_STAGING_LOCK.md"
{
  echo "# URAI Staging Lock"
  echo ""
  echo "Status: Deployed to staging and live smoke completed."
  echo ""
  echo "- Firebase project: $EXPECTED_PROJECT_ID"
  echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
  echo "- Staging URL: $STAGING_URL"
  echo "- Exact tested/deployed SHA: $RELEASE_SHA"
  echo "- Approved ancestor rollback SHA: $ROLLBACK_SHA"
  echo "- Deployed at: $DEPLOYED_AT"
  echo "- Canonical repo: LifeLoggerAI/urai-staging"
  echo "- Deploy command: npm run deploy:staging"
  echo "- Smoke command: npm run smoke:staging"
  echo ""
  echo "## Evidence captured"
  echo ""
  echo "- Clean exact checkout and rollback ancestry"
  echo "- Existing Hosting site; no infrastructure creation"
  echo "- Dependency install, readiness, lockfile, lint, typecheck, build and unit tests"
  echo "- Emulator-backed e2e/rules tests"
  echo "- Firebase deploy: Hosting, Functions, Firestore rules/indexes and Storage rules"
  echo "- Live smoke: /, /u/adamclamp, /api/healthz, /api/buildinfo, /api/companion, /api/waitlist"
  echo ""
  echo "## Not included"
  echo ""
  echo "- Production deployment"
  echo "- Production credentials or data"
  echo "- Proof that the approved rollback SHA is the currently deployed prior revision; that requires separate provider evidence"
} > URAI_STAGING_LOCK.md

rm -f "$FAILURE_REPORT"
step "URAI staging lock completed for $EXPECTED_PROJECT_ID at $STAGING_URL"
