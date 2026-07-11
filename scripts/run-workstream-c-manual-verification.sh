#!/usr/bin/env bash
set -Eeuo pipefail

ADMIN_SHA="${ADMIN_SHA:-71f4f6d461e09bae30584f2bdef6c5deb9c79787}"
PRIVACY_SHA="${PRIVACY_SHA:-f8ed46bec72b7be6cd9ba84bc73fc13a636df600}"
JOBS_SHA="${JOBS_SHA:-dc299c7a34bd416433f46d329ce18f6119bc31bf}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
VERIFIER_SHA="$(git -C "$CONTROL_ROOT" rev-parse HEAD)"
ROOT="${WORKSTREAM_C_ROOT:-$HOME/urai-workstream-c-manual-$STAMP}"
EVIDENCE="$ROOT/evidence"
SUMMARY="$EVIDENCE/summary.md"
FAILURES=0
SHA_PATTERN='^[0-9a-f]{40}$'

mkdir -p "$EVIDENCE/logs"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

for candidate in "$VERIFIER_SHA" "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"; do
  if ! [[ "$candidate" =~ $SHA_PATTERN ]]; then
    echo "Every verifier and candidate identity must be a full lowercase 40-character SHA: $candidate" >&2
    exit 64
  fi
done
if [ -n "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ]; then
  echo "The manual verifier checkout must be clean before execution." >&2
  exit 64
fi

use_node() {
  local version="$1"
  if ! command -v nvm >/dev/null 2>&1; then
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
      # shellcheck disable=SC1090
      . "$HOME/.nvm/nvm.sh"
    else
      echo "nvm is required. In Google Cloud Shell it is normally preinstalled." >&2
      return 1
    fi
  fi
  nvm install "$version"
  nvm use "$version"
  command -v node >/dev/null
  command -v npm >/dev/null
}

ensure_pnpm() {
  local version="$1"
  if ! command -v pnpm >/dev/null 2>&1 || [ "$(pnpm --version 2>/dev/null || true)" != "$version" ]; then
    npm install --global "pnpm@$version"
  fi
  test "$(pnpm --version)" = "$version"
}

ensure_java() {
  local major=0
  if command -v java >/dev/null 2>&1; then
    major="$(java -version 2>&1 | awk -F'[".]' '/version/ {print $2; exit}')"
  fi
  if [ "${major:-0}" -ge 21 ]; then
    return 0
  fi
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jre-headless
}

clone_exact() {
  local repo="$1" sha="$2" dir="$3"
  [[ "$sha" =~ $SHA_PATTERN ]]
  git clone --filter=blob:none --no-checkout "https://github.com/LifeLoggerAI/$repo.git" "$dir"
  git -C "$dir" fetch --depth 1 origin "$sha"
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
  (
    cd "$dir"
    "$@"
  ) 2>&1 | tee "$log_file"
  local status=${PIPESTATUS[0]}
  set -e
  printf '%s\t%s\t%s\n' "$lane" "$name" "$status" >> "$EVIDENCE/status.tsv"
  if [ "$status" -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
  fi
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
  if [ "$actual" != "$sha" ] || [ -n "$status" ]; then
    code=1
    FAILURES=$((FAILURES + 1))
  fi
  printf '%s\t%s\t%s\n' "$lane" 'final-source-clean' "$code" >> "$EVIDENCE/status.tsv"
}

log "Manual Workstream C verification root: $ROOT"
log "Verifier exact head: $VERIFIER_SHA"
ensure_java
printf 'lane\tstep\texit_code\n' > "$EVIDENCE/status.tsv"
printf 'repository\texpected_sha\tactual_sha\n' > "$EVIDENCE/heads.tsv"
printf 'urai-staging-verifier\t%s\t%s\n' "$VERIFIER_SHA" "$VERIFIER_SHA" >> "$EVIDENCE/heads.tsv"

# ADMIN
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

# PRIVACY
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

# JOBS
JOBS_DIR="$ROOT/urai-jobs"
clone_exact urai-jobs "$JOBS_SHA" "$JOBS_DIR"
use_node 22
ensure_pnpm 8.15.9
run_shell_step jobs install "$JOBS_DIR" 'npm --prefix functions ci --ignore-scripts && pnpm install --frozen-lockfile'
run_shell_step jobs exact-head-contract "$JOBS_DIR" 'pnpm ci:exact-head'
run_shell_step jobs source-contracts "$JOBS_DIR" 'pnpm urai-jobs:verify'
run_shell_step jobs typecheck "$JOBS_DIR" 'pnpm typecheck'
run_shell_step jobs build "$JOBS_DIR" 'pnpm build'
run_shell_step jobs tests "$JOBS_DIR" 'pnpm test'
run_shell_step jobs smoke "$JOBS_DIR" 'pnpm urai-jobs:smoke && pnpm urai-jobs:deploy-precheck'
run_shell_step jobs emulator-e2e "$JOBS_DIR" 'npx --yes firebase-tools@15.23.0 emulators:exec --only firestore,auth,functions "node scripts/urai-jobs-e2e.mjs"'

record_final_source_state admin urai-admin "$ADMIN_SHA" "$ADMIN_DIR"
record_final_source_state privacy urai-privacy "$PRIVACY_SHA" "$PRIVACY_DIR"
record_final_source_state jobs urai-jobs "$JOBS_SHA" "$JOBS_DIR"

{
  echo '# URAI Workstream C Manual Verification'
  echo
  echo "- Generated: $(date -u +%FT%TZ)"
  echo "- Verifier: \`$VERIFIER_SHA\`"
  echo "- Admin: \`$ADMIN_SHA\`"
  echo "- Privacy: \`$PRIVACY_SHA\`"
  echo "- Jobs: \`$JOBS_SHA\`"
  echo "- Failed steps: $FAILURES"
  echo
  echo '## Step results'
  echo
  echo '| Lane | Step | Exit |'
  echo '|---|---|---:|'
  tail -n +2 "$EVIDENCE/status.tsv" | while IFS=$'\t' read -r lane step code; do
    echo "| $lane | $step | $code |"
  done
  echo
  if [ "$FAILURES" -eq 0 ]; then
    echo '**MANUAL SOURCE/EMULATOR VERIFICATION: PASS**'
  else
    echo '**MANUAL SOURCE/EMULATOR VERIFICATION: FAIL**'
  fi
  echo
  echo 'This bundle does not authorize production deployment or replace protected staging receipts.'
} > "$SUMMARY"

(
  cd "$EVIDENCE"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

tar -C "$ROOT" -czf "$ROOT/urai-workstream-c-manual-evidence-$STAMP.tar.gz" evidence

cat "$SUMMARY"
echo
log "Evidence bundle: $ROOT/urai-workstream-c-manual-evidence-$STAMP.tar.gz"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh issue comment 46 --repo LifeLoggerAI/urai-admin --body-file "$SUMMARY" || true
fi

if [ "$FAILURES" -ne 0 ]; then
  exit 1
fi
