#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_PROJECT_ID="urai-staging-35414255"
EXPECTED_HOSTING_SITE="urai-staging-35414255"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging-35414255.web.app}"
RELEASE_SHA="${URAI_RELEASE_CANDIDATE_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FAILURE_REPORT="URAI_STAGING_LOCK_FAILED.md"

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
    echo "- Failed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "Run again with: bash -x scripts/urai-staging-lock.sh"
  } > "$FAILURE_REPORT"
  echo "[URAI staging] FAILED with exit code $exit_code. Wrote $FAILURE_REPORT" >&2
  exit "$exit_code"
}
trap on_error ERR

step "Starting lock for project $EXPECTED_PROJECT_ID"

if [ "${URAI_STAGING_PROJECT_ID:-$EXPECTED_PROJECT_ID}" != "$EXPECTED_PROJECT_ID" ]; then
  echo "Refusing deploy: URAI_STAGING_PROJECT_ID must be $EXPECTED_PROJECT_ID" >&2
  exit 1
fi

if [ "${URAI_PRODUCTION_DEPLOY_APPROVED:-0}" = "1" ]; then
  echo "Refusing staging deploy while production approval flag is enabled." >&2
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required for deploy." >&2
  exit 1
fi

step "Selecting Firebase project"
firebase use "$EXPECTED_PROJECT_ID"

step "Checking Firebase Hosting site"
SITE_LIST_FILE="$(mktemp)"
firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" > "$SITE_LIST_FILE"
cat "$SITE_LIST_FILE"
if ! grep -q "$EXPECTED_HOSTING_SITE" "$SITE_LIST_FILE"; then
  step "Hosting site $EXPECTED_HOSTING_SITE not found; creating it"
  firebase hosting:sites:create "$EXPECTED_HOSTING_SITE" --project "$EXPECTED_PROJECT_ID"
else
  step "Hosting site $EXPECTED_HOSTING_SITE exists"
fi
rm -f "$SITE_LIST_FILE"

step "Installing function dependencies"
npm --prefix functions ci

step "Running deploy readiness check"
npm run check:deploy

step "Running lint"
npm run lint

step "Running typecheck"
npm run typecheck

step "Running build"
npm run build

step "Running unit tests"
npm run test:unit

if command -v nix-shell >/dev/null 2>&1; then
  step "Running emulator-backed e2e tests"
  npm run test:e2e
else
  step "nix-shell not found; skipping emulator-backed test:e2e. Run npm run test:e2e manually where Java/Nix is available."
fi

step "Deploying Hosting, Functions, Firestore, and Storage to staging"
URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" URAI_DEPLOYED_AT="$DEPLOYED_AT" firebase deploy --only hosting:"$EXPECTED_HOSTING_SITE",functions,firestore:rules,firestore:indexes,storage --project "$EXPECTED_PROJECT_ID"

step "Running live smoke tests"
URAI_STAGING_PROJECT_ID="$EXPECTED_PROJECT_ID" URAI_STAGING_URL="$STAGING_URL" bash scripts/smoke-staging.sh

step "Writing URAI_STAGING_LOCK.md"
{
  echo "# URAI Staging Lock"
  echo ""
  echo "Status: Locked after local deploy and live smoke."
  echo ""
  echo "- Firebase project: $EXPECTED_PROJECT_ID"
  echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
  echo "- Staging URL: $STAGING_URL"
  echo "- Release candidate SHA: $RELEASE_SHA"
  echo "- Deployed at: $DEPLOYED_AT"
  echo "- Canonical repo app path: LifeLoggerAI/urai-staging"
  echo "- Deploy command: npm run deploy:staging"
  echo "- Smoke command: npm run smoke:staging"
  echo ""
  echo "## Required evidence captured"
  echo ""
  echo "- Dependency install: npm --prefix functions ci"
  echo "- Readiness check: npm run check:deploy"
  echo "- Lint: npm run lint"
  echo "- Typecheck: npm run typecheck"
  echo "- Build: npm run build"
  echo "- Unit tests: npm run test:unit"
  echo "- Emulator tests: npm run test:e2e when nix-shell is available"
  echo "- Firebase deploy: hosting site $EXPECTED_HOSTING_SITE, functions, firestore rules, firestore indexes, storage rules"
  echo "- Live smoke: /, /u/adamclamp, /api/healthz, /api/buildinfo, /api/companion, /api/waitlist"
  echo ""
  echo "## Not included"
  echo ""
  echo "Production deployment is intentionally not performed by this script."
} > URAI_STAGING_LOCK.md

rm -f "$FAILURE_REPORT"
step "URAI staging lock completed for $EXPECTED_PROJECT_ID at $STAGING_URL"
