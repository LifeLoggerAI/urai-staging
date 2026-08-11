#!/usr/bin/env bash
set -euo pipefail

STAGING_PROJECT_ID="${URAI_STAGING_PROJECT_ID:-urai-staging}"
STAGING_URL="${URAI_STAGING_URL:-https://urai-staging.web.app}"
MUTATION_RECEIPT="${URAI_STAGING_MUTATION_RECEIPT:-mutation-evidence/artifacts/deploy/staging-mutation-receipt.json}"
: "${URAI_RELEASE_CANDIDATE_SHA:?URAI_RELEASE_CANDIDATE_SHA is required for exact runtime smoke}"
RELEASE_SHA="$URAI_RELEASE_CANDIDATE_SHA"
BODY_PATH="$(mktemp)"
trap 'rm -f "$BODY_PATH"' EXIT
sha_pattern='^[0-9a-f]{40}$'

if [ "$STAGING_PROJECT_ID" != "urai-staging" ]; then
  echo "Refusing smoke test: URAI_STAGING_PROJECT_ID must be urai-staging" >&2
  exit 1
fi

[[ "$RELEASE_SHA" =~ $sha_pattern ]] || {
  echo "URAI_RELEASE_CANDIDATE_SHA must be a full lowercase 40-character SHA" >&2
  exit 1
}

if [ ! -f "$MUTATION_RECEIPT" ]; then
  echo "Exact staging mutation receipt is required: $MUTATION_RECEIPT" >&2
  exit 1
fi

require_status() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local payload="${4:-}"
  local code
  if [ -n "$payload" ]; then
    code=$(curl --fail-with-body --location --silent --show-error --connect-timeout 15 --max-time 45 \
      -o "$BODY_PATH" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$payload" || true)
  else
    code=$(curl --fail-with-body --location --silent --show-error --connect-timeout 15 --max-time 45 \
      -o "$BODY_PATH" -w "%{http_code}" -X "$method" "$url" || true)
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

  node - "$BODY_PATH" <<'NODE'
const fs = require('node:fs');
const bodyPath = process.argv[2];
let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(bodyPath, 'utf8'));
} catch (error) {
  console.error(`Expected valid JSON API response: ${error.message}`);
  process.exit(1);
}
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error('Expected a JSON object response.');
  process.exit(1);
}
NODE
}

require_status GET "$STAGING_URL/" 200
require_status GET "$STAGING_URL/u/adamclamp" 200
require_status GET "$STAGING_URL/robots.txt" 200
require_json_api_status GET "$STAGING_URL/api/healthz" 200
require_json_api_status GET "$STAGING_URL/api/buildinfo" 200

node - "$BODY_PATH" "$STAGING_PROJECT_ID" "$STAGING_URL" "$RELEASE_SHA" "$MUTATION_RECEIPT" <<'NODE'
const fs = require('node:fs');
const [bodyPath, expectedProject, expectedUrl, expectedSha, receiptPath] = process.argv.slice(2);
const body = JSON.parse(fs.readFileSync(bodyPath, 'utf8'));
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const failures = [];

if (receipt.schemaVersion !== 'urai-staging-mutation-2') failures.push('mutation receipt schema must be urai-staging-mutation-2');
if (receipt.sourceSha !== expectedSha) failures.push(`mutation receipt sourceSha must equal ${expectedSha}`);
if (receipt.projectId !== expectedProject) failures.push(`mutation receipt projectId must equal ${expectedProject}`);
if (receipt.hostingUrl !== expectedUrl) failures.push(`mutation receipt hostingUrl must equal ${expectedUrl}`);
if (receipt.deploymentCommandCompleted !== true) failures.push('mutation receipt must prove a completed deployment command');
if (typeof receipt.deployedAt !== 'string' || Number.isNaN(Date.parse(receipt.deployedAt))) {
  failures.push('mutation receipt deployedAt must be a real ISO-8601 deployment timestamp');
}
if (!/^\d+$/.test(String(receipt.workflowRunId ?? ''))) {
  failures.push('mutation receipt workflowRunId must be numeric');
}

if (body.status !== 'ok') failures.push('status must be ok');
if (body.service !== 'urai-staging') failures.push('service must be urai-staging');
if (body.projectId !== expectedProject) failures.push(`projectId must be ${expectedProject}`);
if (body.hostingUrl !== expectedUrl) failures.push(`hostingUrl must be ${expectedUrl}`);
if (body.releaseCandidateSha !== expectedSha) {
  failures.push(`releaseCandidateSha must equal exact candidate ${expectedSha}, received ${String(body.releaseCandidateSha)}`);
}
if (body.deployedAt !== receipt.deployedAt) {
  failures.push(`deployedAt must equal current mutation receipt ${String(receipt.deployedAt)}, received ${String(body.deployedAt)}`);
}
if (String(body.deploymentWorkflowRunId ?? '') !== String(receipt.workflowRunId)) {
  failures.push(`deploymentWorkflowRunId must equal current mutation workflow ${String(receipt.workflowRunId)}, received ${String(body.deploymentWorkflowRunId)}`);
}
if (body.runtimeProjectId !== expectedProject) {
  failures.push(`runtimeProjectId must equal ${expectedProject}, received ${String(body.runtimeProjectId)}`);
}

if (failures.length) {
  console.error('Exact staging runtime identity verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Exact runtime identity verified for ${expectedSha}, mutation workflow ${receipt.workflowRunId}, deployed at ${receipt.deployedAt}.`);
NODE

# Default release smoke is intentionally non-mutating. It proves the public
# validation boundaries without writing staging_events or staging_waitlist.
require_json_api_status POST "$STAGING_URL/api/companion" 400 '{"message":""}'
require_json_api_status POST "$STAGING_URL/api/waitlist" 400 '{"email":"not-an-email","source":"staging-smoke"}'

if command -v firebase >/dev/null 2>&1; then
  active_project=$(firebase use 2>/dev/null | sed -n 's/.*Active Project: //p' | tr -d '[:space:]' || true)
  if [ -n "$active_project" ] && [ "$active_project" != "$STAGING_PROJECT_ID" ]; then
    echo "Warning: firebase active project is $active_project, expected $STAGING_PROJECT_ID. Smoke URL checks still passed."
  fi
fi

echo "URAI staging non-mutating live smoke passed for $STAGING_URL at exact SHA $RELEASE_SHA and current mutation receipt"
