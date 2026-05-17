#!/usr/bin/env bash
set -euo pipefail

STAGING_PROJECT_ID="${URAI_STAGING_PROJECT_ID:-urai-staging}"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging.web.app}"

if [ "$STAGING_PROJECT_ID" != "urai-staging" ]; then
  echo "Refusing smoke test: URAI_STAGING_PROJECT_ID must be urai-staging" >&2
  exit 1
fi

require_status() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local payload="${4:-}"
  local code
  if [ -n "$payload" ]; then
    code=$(curl -sS -o /tmp/urai-smoke-body.json -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$payload")
  else
    code=$(curl -sS -o /tmp/urai-smoke-body.json -w "%{http_code}" -X "$method" "$url")
  fi
  echo "$method $url -> $code"
  cat /tmp/urai-smoke-body.json || true
  echo
  if [ "$code" != "$expected" ]; then
    echo "Expected HTTP $expected but received HTTP $code for $url" >&2
    exit 1
  fi
}

require_status GET "$STAGING_URL/" 200
require_status GET "$STAGING_URL/u/adamclamp" 200
require_status GET "$STAGING_URL/api/healthz" 200
require_status GET "$STAGING_URL/api/buildinfo" 200
require_status POST "$STAGING_URL/api/companion" 200 '{"message":"Staging smoke check","source":"scripts/smoke-staging.sh"}'
require_status POST "$STAGING_URL/api/companion" 400 '{"message":""}'
require_status POST "$STAGING_URL/api/waitlist" 200 '{"email":"launch-smoke@example.com","source":"staging-smoke","handle":"adamclamp","intent":"early-access"}'

if command -v firebase >/dev/null 2>&1; then
  active_project=$(firebase use 2>/dev/null | sed -n 's/.*Active Project: //p' | tr -d '[:space:]' || true)
  if [ -n "$active_project" ] && [ "$active_project" != "$STAGING_PROJECT_ID" ]; then
    echo "Warning: firebase active project is $active_project, expected $STAGING_PROJECT_ID. Smoke URL checks still passed."
  fi
fi

echo "URAI staging live smoke passed for $STAGING_URL"
