#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PROJECT_ID="urai-staging-35414255"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging-35414255.web.app}"
RELEASE_SHA="${URAI_RELEASE_CANDIDATE_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

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

firebase use "$EXPECTED_PROJECT_ID" >/dev/null

npm --prefix functions ci
npm run check:deploy
npm run lint
npm run typecheck
npm run build
npm run test:unit

if command -v nix-shell >/dev/null 2>&1; then
  npm run test:e2e
else
  echo "nix-shell not found; skipping emulator-backed test:e2e. Run npm run test:e2e manually where Java/Nix is available."
fi

URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA" URAI_DEPLOYED_AT="$DEPLOYED_AT" firebase deploy --only hosting,functions,firestore:rules,firestore:indexes --project "$EXPECTED_PROJECT_ID"

URAI_STAGING_PROJECT_ID="$EXPECTED_PROJECT_ID" URAI_STAGING_URL="$STAGING_URL" bash scripts/smoke-staging.sh

{
  echo "# URAI Staging Lock"
  echo ""
  echo "Status: Locked after local deploy and live smoke."
  echo ""
  echo "- Firebase project: $EXPECTED_PROJECT_ID"
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
  echo "- Firebase deploy: hosting, functions, firestore rules, firestore indexes"
  echo "- Live smoke: /, /u/adamclamp, /api/healthz, /api/buildinfo, /api/companion, /api/waitlist"
  echo ""
  echo "## Not included"
  echo ""
  echo "Production deployment is intentionally not performed by this script."
} > URAI_STAGING_LOCK.md

echo "URAI staging lock completed for $EXPECTED_PROJECT_ID at $STAGING_URL"
