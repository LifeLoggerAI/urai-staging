#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_PROJECT_ID='urai-staging'
EXPECTED_HOSTING_SITE='urai-staging'
EXPECTED_STAGING_URL='https://urai-staging.web.app'
STAGING_URL="${URAI_STAGING_URL:-$EXPECTED_STAGING_URL}"
RELEASE_SHA="${URAI_RELEASE_CANDIDATE_SHA:-}"
DEPLOYED_AT="$(date -u +%FT%TZ)"
FAILURE_REPORT='URAI_STAGING_LOCK_FAILED.md'
SITE_LIST_FILE=''

step() {
  echo "[URAI staging] $1"
}

cleanup() {
  if [ -n "$SITE_LIST_FILE" ]; then rm -f -- "$SITE_LIST_FILE"; fi
}

on_error() {
  local exit_code=$?
  {
    echo '# URAI Staging Lock Failed'
    echo
    echo "- Exit code: $exit_code"
    echo "- Firebase project: $EXPECTED_PROJECT_ID"
    echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
    echo "- Staging URL: $STAGING_URL"
    echo "- Release candidate SHA: ${RELEASE_SHA:-missing}"
    echo "- Workflow run: ${GITHUB_RUN_ID:-missing}"
    echo "- Failed at: $(date -u +%FT%TZ)"
  } > "$FAILURE_REPORT"
  echo "[URAI staging] FAILED with exit code $exit_code. Wrote $FAILURE_REPORT" >&2
  exit "$exit_code"
}
trap cleanup EXIT
trap on_error ERR

step "Proving protected staging deployment authority"

[ "${URAI_STAGING_PROTECTED_DEPLOY:-0}" = '1' ] || {
  echo 'Refusing deploy: URAI_STAGING_PROTECTED_DEPLOY=1 is required.' >&2
  exit 1
}
[ "${GITHUB_ACTIONS:-false}" = 'true' ] || {
  echo 'Refusing deploy outside GitHub Actions protected authority.' >&2
  exit 1
}
[ "${GITHUB_REF:-}" = 'refs/heads/main' ] || {
  echo 'Refusing deploy unless the workflow was dispatched from main.' >&2
  exit 1
}
[ "${URAI_STAGING_PROJECT_ID:-}" = "$EXPECTED_PROJECT_ID" ] || {
  echo "Refusing deploy: URAI_STAGING_PROJECT_ID must be $EXPECTED_PROJECT_ID" >&2
  exit 1
}
[ "$STAGING_URL" = "$EXPECTED_STAGING_URL" ] || {
  echo "Refusing deploy: URAI_STAGING_URL must be $EXPECTED_STAGING_URL" >&2
  exit 1
}
[ "${URAI_PRODUCTION_DEPLOY_APPROVED:-0}" = '0' ] || {
  echo 'Refusing staging deploy while production approval is enabled.' >&2
  exit 1
}
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || {
  echo 'Refusing deploy: release candidate must be a full lowercase SHA.' >&2
  exit 1
}
[ "${GITHUB_SHA:-}" = "$RELEASE_SHA" ] || {
  echo 'Refusing deploy: workflow SHA does not equal the release candidate.' >&2
  exit 1
}
[ "$(git rev-parse HEAD)" = "$RELEASE_SHA" ] || {
  echo 'Refusing deploy: checkout does not equal the release candidate.' >&2
  exit 1
}
[ -z "$(git status --porcelain --untracked-files=all)" ] || {
  echo 'Refusing deploy from a dirty checkout.' >&2
  exit 1
}

remote_main_sha="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
[ "$remote_main_sha" = "$RELEASE_SHA" ] || {
  echo 'Refusing deploy: release candidate is not unchanged current remote main.' >&2
  exit 1
}

[ -n "${RUNNER_TEMP:-}" ] || {
  echo 'Refusing deploy without RUNNER_TEMP confinement.' >&2
  exit 1
}
[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] || {
  echo 'Refusing deploy without the managed staging credential path.' >&2
  exit 1
}
case "$GOOGLE_APPLICATION_CREDENTIALS" in
  "$RUNNER_TEMP"/*) ;;
  *) echo 'Refusing deploy: credential path must stay under RUNNER_TEMP.' >&2; exit 1 ;;
esac
[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ] || {
  echo 'Refusing deploy: managed staging credential file is missing.' >&2
  exit 1
}

command -v firebase >/dev/null 2>&1 || {
  echo 'firebase CLI is required for protected deploy.' >&2
  exit 1
}

step "Checking pre-existing Firebase Hosting site"
SITE_LIST_FILE="$(mktemp "$RUNNER_TEMP/urai-staging-sites.XXXXXX")"
firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" > "$SITE_LIST_FILE"
cat "$SITE_LIST_FILE"
grep -q "$EXPECTED_HOSTING_SITE" "$SITE_LIST_FILE" || {
  echo "Refusing deploy: required Hosting site $EXPECTED_HOSTING_SITE does not already exist." >&2
  exit 1
}

step 'Running deploy readiness check'
npm run check:deploy
step 'Running lint'
npm run lint
step 'Running typecheck'
npm run typecheck
step 'Running build'
npm run build
step 'Running unit tests'
npm run test:unit
step 'Running emulator-backed rules tests'
npm run test:rules
step 'Running emulator-backed end-to-end tests'
npm run test:e2e

[ "$(git rev-parse HEAD)" = "$RELEASE_SHA" ] || {
  echo 'Refusing deploy: source identity changed during verification.' >&2
  exit 1
}
[ -z "$(git status --porcelain --untracked-files=all)" ] || {
  echo 'Refusing deploy: verification left source residue.' >&2
  exit 1
}

step 'Deploying exact verified main to Firebase staging'
URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" \
URAI_DEPLOYED_AT="$DEPLOYED_AT" \
firebase deploy \
  --only hosting:"$EXPECTED_HOSTING_SITE",functions,firestore:rules,firestore:indexes,storage \
  --project "$EXPECTED_PROJECT_ID" \
  --non-interactive

step 'Running strict live staging smoke tests'
URAI_STAGING_PROJECT_ID="$EXPECTED_PROJECT_ID" \
URAI_STAGING_URL="$STAGING_URL" \
bash scripts/smoke-staging.sh

step 'Writing immutable staging lock receipt'
{
  echo '# URAI Staging Lock'
  echo
  echo 'Status: Locked after protected exact-main deploy and live smoke.'
  echo
  echo "- Firebase project: $EXPECTED_PROJECT_ID"
  echo "- Firebase Hosting site: $EXPECTED_HOSTING_SITE"
  echo "- Staging URL: $STAGING_URL"
  echo "- Exact deployed main SHA: $RELEASE_SHA"
  echo "- Deployed at: $DEPLOYED_AT"
  echo "- GitHub workflow: ${GITHUB_WORKFLOW:-missing}"
  echo "- GitHub workflow run: ${GITHUB_RUN_ID:-missing}"
  echo "- GitHub actor: ${GITHUB_ACTOR:-missing}"
  echo '- Protected environment: staging'
  echo '- Hosting site pre-existed: true'
  echo '- Production approval enabled: false'
  echo '- Production deployment performed: false'
  echo '- Canonical repo app path: LifeLoggerAI/urai-staging'
  echo '- Deploy command: npm run deploy:staging'
  echo '- Smoke command: npm run smoke:staging'
  echo
  echo '## Evidence captured'
  echo
  echo '- Exact current-main and clean-source proof'
  echo '- Deploy readiness, lint, typecheck, build, unit, rules, and end-to-end tests'
  echo '- Hosting, Functions, Firestore rules/indexes, and Storage deployment'
  echo '- Strict live smoke for public and API staging surfaces'
} > URAI_STAGING_LOCK.md

rm -f -- "$FAILURE_REPORT"
step "URAI staging lock completed for exact main $RELEASE_SHA at $STAGING_URL"
