#!/usr/bin/env bash
set -euo pipefail

STAGING_PROJECT_ID="${URAI_STAGING_PROJECT_ID:-urai-staging}"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging.web.app}"
BODY_PATH="/tmp/urai-smoke-body.json"

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
    code=$(curl -sS -o "$BODY_PATH" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$payload")
  else
    code=$(curl -sS -o "$BODY_PATH" -w "%{http_code}" -X "$method" "$url")
  fi
  echo "$method $url -> $code"
  cat "$BODY_PATH" || true
  echo
  if [ "$code" != "$expected" ]; then
    echo "Expected HTTP $expected but received HTTP $code for $url" >&2
    exit 1
  fi
}

require_json_api_status() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local payload="${4:-}"

  require_status "$method" "$url" "$expected" "$payload"

  if grep -qi '<!doctype html\|<html' "$BODY_PATH"; then
    echo "Expected JSON API response but received an HTML shell for $url" >&2
    echo "This usually means Firebase Hosting is serving the SPA fallback and the Function rewrite is not live." >&2
    exit 1
  fi

  if ! grep -q '"status"\|"error"\|"service"' "$BODY_PATH"; then
    echo "Expected JSON API smoke payload for $url, but response did not include a known API field." >&2
    exit 1
  fi
}

require_status GET "$STAGING_URL/" 200
require_status GET "$STAGING_URL/u/adamclamp" 200
require_status GET "$STAGING_URL/robots.txt" 200
require_json_api_status GET "$STAGING_URL/api/healthz" 200
require_json_api_status GET "$STAGING_URL/api/buildinfo" 200
require_json_api_status POST "$STAGING_URL/api/companion" 200 '{"message":"Staging smoke check","source":"scripts/smoke-staging.sh"}'
require_json_api_status POST "$STAGING_URL/api/companion" 400 '{"message":""}'
require_json_api_status POST "$STAGING_URL/api/waitlist" 200 '{"email":"launch-smoke@example.com","source":"staging-smoke","handle":"adamclamp","intent":"early-access"}'

if command -v firebase >/dev/null 2>&1; then
  active_project=$(firebase use 2>/dev/null | sed -n 's/.*Active Project: //p' | tr -d '[:space:]' || true)
  if [ -n "$active_project" ] && [ "$active_project" != "$STAGING_PROJECT_ID" ]; then
    echo "Warning: firebase active project is $active_project, expected $STAGING_PROJECT_ID. Smoke URL checks still passed."
  fi
fi

echo "URAI staging live smoke passed for $STAGING_URL"
