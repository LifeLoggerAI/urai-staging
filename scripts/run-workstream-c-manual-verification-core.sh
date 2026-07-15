#!/usr/bin/env bash
set -Eeuo pipefail

ADMIN_SHA="${ADMIN_SHA:-6d1e84640544098ae71040fca4c7f8893e0f2fd4}"
PRIVACY_SHA="${PRIVACY_SHA:-371e9a8db9b24a0cbdd3a6753776be6920ce736c}"
JOBS_SHA="${JOBS_SHA:-ed7f80517e4fa940472a93f22e9d42e080ddeb6c}"
CONTENT_SHA="${CONTENT_SHA:-227df755844fb5c192dd8298f3e130f0e84f29cc}"
ANALYTICS_SHA="${ANALYTICS_SHA:-5bf2b2a578b80d05227e8a07e41846d68ff60938}"
COMMUNICATIONS_SHA="${COMMUNICATIONS_SHA:-180cbab717c858b553440944c1a47ee16d547983}"
JOBS_LOCAL_SOURCE="${JOBS_LOCAL_SOURCE:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
VERIFIER_SHA="$(git -C "$CONTROL_ROOT" rev-parse HEAD)"
ROOT="${WORKSTREAM_C_ROOT:?WORKSTREAM_C_ROOT must be set by the confined Workstream C wrapper}"
EVIDENCE="$ROOT/evidence"
SUMMARY="$EVIDENCE/summary.md"
FAILURE_EXCERPTS="$EVIDENCE/failure-excerpts.txt"
FAILURES=0
SHA_PATTERN='^[0-9a-f]{40}$'
PUBLIC_REGISTRY='https://registry.npmjs.org/'

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[workstream-c-manual] FAIL: $*" >&2; exit 64; }

confined_path() {
  local name="$1" value="$2" resolved
  [ -n "$value" ] || fail "$name must be set"
  resolved="$(realpath -m -- "$value")"
  case "$resolved" in
    "$ROOT"|"$ROOT"/*) ;;
    *) fail "$name must resolve inside the confined verifier root" ;;
  esac
}

[ "${WORKSTREAM_C_CONFINED:-}" = '1' ] || fail 'Direct invocation is forbidden; use run-workstream-c-cloud-shell.sh'
ROOT="$(realpath -m -- "$ROOT")"
[ "$(dirname -- "$ROOT")" = '/tmp' ] || fail 'WORKSTREAM_C_ROOT must resolve directly below /tmp'
case "$(basename -- "$ROOT")" in
  urai-workstream-c-manual-*) ;;
  *) fail 'WORKSTREAM_C_ROOT basename must start with urai-workstream-c-manual-' ;;
esac
[ -d "$ROOT" ] && [ ! -L "$ROOT" ] || fail 'WORKSTREAM_C_ROOT must be a real existing directory'
[ -z "${FIREBASE_TOKEN:-}" ] || fail 'FIREBASE_TOKEN must be unset'
[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] || fail 'GOOGLE_APPLICATION_CREDENTIALS must be unset'
for pair in \
  "NPM_CONFIG_CACHE=${NPM_CONFIG_CACHE:-}" \
  "npm_config_cache=${npm_config_cache:-}" \
  "npm_config_store_dir=${npm_config_store_dir:-}" \
  "PIP_CACHE_DIR=${PIP_CACHE_DIR:-}" \
  "XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-}" \
  "CLOUDSDK_CONFIG=${CLOUDSDK_CONFIG:-}" \
  "FIREBASE_EMULATORS_PATH=${FIREBASE_EMULATORS_PATH:-}" \
  "TMPDIR=${TMPDIR:-}"; do
  confined_path "${pair%%=*}" "${pair#*=}"
done
mkdir -p "$EVIDENCE/logs"

for candidate in "$VERIFIER_SHA" "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA" "$CONTENT_SHA" "$ANALYTICS_SHA" "$COMMUNICATIONS_SHA"; do
  [[ "$candidate" =~ $SHA_PATTERN ]] || fail "Every verifier and candidate identity must be a full lowercase 40-character SHA: $candidate"
done
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail 'The manual verifier checkout must be clean before execution'

use_node() {
  local version="$1"
  if ! command -v nvm >/dev/null 2>&1; then
    [ -s "$HOME/.nvm/nvm.sh" ] || fail 'nvm is required'
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
  fi
  nvm install "$version"
  nvm use "$version"
  command -v node >/dev/null
  command -v npm >/dev/null
}

ensure_pnpm() {
  local version="$1"
  local prefix="$ROOT/tooling/pnpm-$version"
  mkdir -p "$prefix"
  if [ ! -x "$prefix/bin/pnpm" ]; then
    npm install --global --prefix "$prefix" "pnpm@$version" --registry="$PUBLIC_REGISTRY"
  fi
  export PATH="$prefix/bin:$PATH"
  hash -r
  test "$(command -v pnpm)" = "$prefix/bin/pnpm"
  test "$(pnpm --version)" = "$version"
}

ensure_java() {
  local major=0
  if command -v java >/dev/null 2>&1; then
    major="$(java -version 2>&1 | awk -F'[\".]' '/version/ {print $2; exit}')"
  fi
  if [ "${major:-0}" -ge 21 ]; then return 0; fi
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jre-headless
}

clone_exact() {
  local repo="$1" sha="$2" dir="$3" local_source="${4:-}"
  [[ "$sha" =~ $SHA_PATTERN ]]
  if [ -n "$local_source" ]; then
    [ "$repo" = 'urai-jobs' ] || fail 'Only the Jobs lane may use a local pre-push candidate source'
    local_source="$(realpath -e -- "$local_source")"
    [ -d "$local_source/.git" ] || fail 'JOBS_LOCAL_SOURCE must be a git checkout'
    [ ! -L "$local_source" ] || fail 'JOBS_LOCAL_SOURCE must not be a symlink'
    case "$local_source" in
      /tmp/urai-jobs-dependency-repair-*/urai-jobs) ;;
      *) fail 'JOBS_LOCAL_SOURCE must be the confined Jobs repair checkout' ;;
    esac
    [ "$(git -C "$local_source" rev-parse HEAD)" = "$sha" ] || fail 'Local Jobs source is not the exact candidate SHA'
    [ -z "$(git -C "$local_source" status --porcelain --untracked-files=all)" ] || fail 'Local Jobs candidate must be clean'
    git clone --no-local --no-checkout "$local_source" "$dir"
  else
    git clone --filter=blob:none --no-checkout "https://github.com/LifeLoggerAI/$repo.git" "$dir"
    git -C "$dir" fetch --depth 1 origin "$sha"
  fi
  git -C "$dir" checkout --detach "$sha"
  test "$(git -C "$dir" rev-parse HEAD)" = "$sha"
  test -z "$(git -C "$dir" status --porcelain --untracked-files=all)"
}

run_step() {
  local lane="$1" name="$2" dir="$3"
  shift 3
  local log_file="$EVIDENCE/logs/${lane}-${name}.log"
  log "$lane :: $name"
  set +e
  (cd "$dir" && "$@") 2>&1 | tee "$log_file"
  local status=${PIPESTATUS[0]}
  set -e
  printf '%s\t%s\t%s\n' "$lane" "$name" "$status" >> "$EVIDENCE/status.tsv"
  if [ "$status" -ne 0 ]; then FAILURES=$((FAILURES + 1)); fi
  return 0
}

run_shell_step() {
  local lane="$1" name="$2" dir="$3" command="$4"
  run_step "$lane" "$name" "$dir" bash -c "$command"
}

record_final_source_state() {
  local lane="$1" repo="$2" sha="$3" dir="$4"
  local actual status code=0
  actual="$(git -C "$dir" rev-parse HEAD)"
  status="$(git -C "$dir" status --porcelain --untracked-files=all || true)"
  printf '%s\t%s\t%s\n' "$repo" "$sha" "$actual" >> "$EVIDENCE/heads.tsv"
  printf '%s\n' "$status" > "$EVIDENCE/logs/${repo}-final-git-status.log"
  if [ "$actual" != "$sha" ] || [ -n "$status" ]; then code=1; FAILURES=$((FAILURES + 1)); fi
  printf '%s\t%s\t%s\n' "$lane" 'final-source-clean' "$code" >> "$EVIDENCE/status.tsv"
}

build_failure_excerpts() {
  : > "$FAILURE_EXCERPTS"
  while IFS=$'\t' read -r lane step code; do
    [ "$lane" = 'lane' ] && continue
    [ "$code" = '0' ] && continue
    local log_file="$EVIDENCE/logs/${lane}-${step}.log"
    [ "$step" != 'final-source-clean' ] || log_file="$EVIDENCE/logs/urai-${lane}-final-git-status.log"
    {
      printf '\n===== %s :: %s (exit %s) =====\n' "$lane" "$step" "$code"
      if [ -f "$log_file" ]; then tail -n 30 "$log_file"; else echo 'No step log was produced.'; fi
    } >> "$FAILURE_EXCERPTS"
  done < "$EVIDENCE/status.tsv"
}

log "Manual Workstream C verification root: $ROOT"
log "Verifier exact head: $VERIFIER_SHA"
ensure_java
printf 'lane\tstep\texit_code\n' > "$EVIDENCE/status.tsv"
printf 'repository\texpected_sha\tactual_sha\n' > "$EVIDENCE/heads.tsv"
printf 'urai-staging-verifier\t%s\t%s\n' "$VERIFIER_SHA" "$VERIFIER_SHA" >> "$EVIDENCE/heads.tsv"

ADMIN_DIR="$ROOT/urai-admin"
clone_exact urai-admin "$ADMIN_SHA" "$ADMIN_DIR"
use_node 22
ensure_pnpm 9.15.0
run_shell_step admin install "$ADMIN_DIR" 'pnpm install --frozen-lockfile'
run_shell_step admin registry-contract "$ADMIN_DIR" 'pnpm test:registry'
run_shell_step admin security-gate "$ADMIN_DIR" 'pnpm security:gate'
run_shell_step admin active-functions "$ADMIN_DIR" 'pnpm functions:typecheck:active && pnpm functions:build:active'
run_shell_step admin lint "$ADMIN_DIR" 'pnpm lint'
run_shell_step admin typecheck "$ADMIN_DIR" 'pnpm typecheck'
run_shell_step admin tests "$ADMIN_DIR" 'pnpm test'
run_shell_step admin build "$ADMIN_DIR" 'pnpm build'
run_shell_step admin production-preflight-fails-closed "$ADMIN_DIR" 'unset FIREBASE_TOKEN NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID NEXT_PUBLIC_FIREBASE_APP_ID; set +e; output="$(pnpm preflight:production 2>&1)"; s=$?; set -e; printf "%s\n" "$output"; test "$s" -ne 0; grep -q -- "--- Production preflight failed ---" <<<"$output"; ! grep -q "command not found" <<<"$output"'
run_shell_step admin emulator-receipt "$ADMIN_DIR" 'pnpm receipt:system-registry:emulator'
if [ -f "$ADMIN_DIR/docs/release-evidence/admin-system-registry-emulator-receipt.json" ]; then
  cp "$ADMIN_DIR/docs/release-evidence/admin-system-registry-emulator-receipt.json" "$EVIDENCE/"
  rm -f "$ADMIN_DIR/docs/release-evidence/admin-system-registry-emulator-receipt.json"
fi

PRIVACY_DIR="$ROOT/urai-privacy"
PRIVACY_VENV="$ROOT/privacy-validator-venv"
clone_exact urai-privacy "$PRIVACY_SHA" "$PRIVACY_DIR"
use_node 20.19.0
run_shell_step privacy root-install "$PRIVACY_DIR" 'npm ci'
run_shell_step privacy functions-install "$PRIVACY_DIR" 'npm ci --prefix functions'
run_shell_step privacy python-validators "$PRIVACY_DIR" "python3 -m venv '$PRIVACY_VENV' && . '$PRIVACY_VENV/bin/activate' && pip install -r requirements.txt && python -m unittest discover -s tests -p 'test_*.py' && python tools/check_secrets.py && python tools/check_website.py && python tools/validate_privacy_package.py"
run_shell_step privacy lint-typecheck "$PRIVACY_DIR" 'npm run lint && npm run typecheck'
run_shell_step privacy unit-rules-routes "$PRIVACY_DIR" 'npm run test:unit && npm run test:rules:static && npm run test:e2e'
run_shell_step privacy audits "$PRIVACY_DIR" 'npm run audit:privacy && npm run audit:tier-one'
run_shell_step privacy builds "$PRIVACY_DIR" 'npm run build && npm --prefix functions run build && npm --prefix functions run typecheck'
run_shell_step privacy emulator-tests "$PRIVACY_DIR" 'npm run check:java && npm run test:emulators'
run_shell_step privacy security-and-readiness "$PRIVACY_DIR" 'npm run security:gate && bash scripts/assert-production-ready.sh && URAI_PRIVACY_REQUIRE_AUTH_LIVE_PROOF=0 npm run test:live-auth-proof'
run_shell_step privacy release-verifier "$PRIVACY_DIR" 'bash scripts/verify-release.sh'

JOBS_DIR="$ROOT/urai-jobs"
clone_exact urai-jobs "$JOBS_SHA" "$JOBS_DIR" "$JOBS_LOCAL_SOURCE"
use_node 22
ensure_pnpm 8.15.9
run_shell_step jobs install "$JOBS_DIR" 'npm --prefix functions ci --ignore-scripts && pnpm install --frozen-lockfile'
run_shell_step jobs exact-head-contract "$JOBS_DIR" 'pnpm ci:exact-head'
run_shell_step jobs source-contracts "$JOBS_DIR" 'pnpm urai-jobs:verify'
run_shell_step jobs typecheck "$JOBS_DIR" 'pnpm typecheck'
run_shell_step jobs build "$JOBS_DIR" 'pnpm build'
run_shell_step jobs tests "$JOBS_DIR" 'pnpm test'
run_shell_step jobs smoke "$JOBS_DIR" 'pnpm urai-jobs:smoke && pnpm urai-jobs:deploy-precheck'
run_shell_step jobs emulator-e2e "$JOBS_DIR" 'NO_GCE_CHECK=true npx --yes firebase-tools@15.23.0 emulators:exec --only firestore,auth,functions,storage,pubsub "node scripts/urai-jobs-e2e.mjs"'

CONTENT_DIR="$ROOT/urai-content"
clone_exact urai-content "$CONTENT_SHA" "$CONTENT_DIR"
use_node 22
run_shell_step content install "$CONTENT_DIR" 'npm ci'
run_shell_step content full-check "$CONTENT_DIR" 'npm run check'
run_shell_step content web-install "$CONTENT_DIR" 'npm ci --prefix apps/web'
run_shell_step content web-check "$CONTENT_DIR" 'npm run web:check'

ANALYTICS_DIR="$ROOT/urai-analytics"
clone_exact urai-analytics "$ANALYTICS_SHA" "$ANALYTICS_DIR"
use_node 22
run_shell_step analytics install "$ANALYTICS_DIR" 'npm ci'
run_shell_step analytics full-check "$ANALYTICS_DIR" 'npm run full:check'
run_shell_step analytics build "$ANALYTICS_DIR" 'npm run build'

COMMUNICATIONS_DIR="$ROOT/urai-communications"
clone_exact urai-communications "$COMMUNICATIONS_SHA" "$COMMUNICATIONS_DIR"
use_node 20
run_shell_step communications install "$COMMUNICATIONS_DIR" 'npm ci'
run_shell_step communications lint-typecheck "$COMMUNICATIONS_DIR" 'npm run lint && npm run typecheck'
run_shell_step communications tests-build "$COMMUNICATIONS_DIR" 'npm run test && npm run build'
run_shell_step communications smoke-no-live-claims "$COMMUNICATIONS_DIR" 'npm run smoke && npm run verify:no-live-claims'

record_final_source_state admin urai-admin "$ADMIN_SHA" "$ADMIN_DIR"
record_final_source_state privacy urai-privacy "$PRIVACY_SHA" "$PRIVACY_DIR"
record_final_source_state jobs urai-jobs "$JOBS_SHA" "$JOBS_DIR"
record_final_source_state content urai-content "$CONTENT_SHA" "$CONTENT_DIR"
record_final_source_state analytics urai-analytics "$ANALYTICS_SHA" "$ANALYTICS_DIR"
record_final_source_state communications urai-communications "$COMMUNICATIONS_SHA" "$COMMUNICATIONS_DIR"
build_failure_excerpts

{
  echo '# URAI Workstream C Six-Service Verification'
  echo
  echo "- Generated: $(date -u +%FT%TZ)"
  echo "- Verifier: \`$VERIFIER_SHA\`"
  echo "- Admin: \`$ADMIN_SHA\`"
  echo "- Privacy: \`$PRIVACY_SHA\`"
  echo "- Jobs: \`$JOBS_SHA\`"
  echo "- Content: \`$CONTENT_SHA\`"
  echo "- Analytics: \`$ANALYTICS_SHA\`"
  echo "- Communications: \`$COMMUNICATIONS_SHA\`"
  echo "- Jobs source: $([ -n "$JOBS_LOCAL_SOURCE" ] && echo 'confined local pre-push candidate' || echo 'canonical GitHub exact commit')"
  echo "- Credentialed: false"
  echo "- Protected apply: false"
  echo "- Failed steps: $FAILURES"
  echo
  echo '## Step results'
  echo
  echo '| Lane | Step | Exit |'
  echo '|---|---|---:|'
  tail -n +2 "$EVIDENCE/status.tsv" | while IFS=$'\t' read -r lane step code; do echo "| $lane | $step | $code |"; done
  echo
  if [ "$FAILURES" -eq 0 ]; then
    echo '**SIX-SERVICE SOURCE/BUILD/TEST VERIFICATION: PASS**'
  else
    echo '**SIX-SERVICE SOURCE/BUILD/TEST VERIFICATION: FAIL**'
    echo
    echo 'Compact log tails are recorded in `failure-excerpts.txt`.'
  fi
  echo
  echo 'This bundle does not authorize protected staging apply, production deployment, provider delivery or production-data mutation.'
} > "$SUMMARY"

(
  cd "$EVIDENCE"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

tar -C "$ROOT" -czf "$ROOT/urai-workstream-c-manual-evidence-$STAMP.tar.gz" evidence
cat "$SUMMARY"
echo
log "Evidence bundle: $ROOT/urai-workstream-c-manual-evidence-$STAMP.tar.gz"
if [ "$FAILURES" -ne 0 ]; then log "Failure excerpts: $FAILURE_EXCERPTS"; fi

case "${WORKSTREAM_C_PUBLISH_SUMMARY:-0}" in
  0)
    log 'GitHub summary publication disabled (default no-mutation mode)'
    ;;
  1)
    [ "$FAILURES" -eq 0 ] || fail 'Summary publication requires a fully passing verifier'
    command -v gh >/dev/null 2>&1 || fail 'Summary publication requested but gh is unavailable'
    gh auth status >/dev/null 2>&1 || fail 'Summary publication requested but gh is not authenticated'
    gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY"
    ;;
  *)
    fail 'WORKSTREAM_C_PUBLISH_SUMMARY must be 0 or 1'
    ;;
esac

[ "$FAILURES" -eq 0 ] || exit 1
