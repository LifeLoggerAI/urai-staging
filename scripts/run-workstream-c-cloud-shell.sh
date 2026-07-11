#!/usr/bin/env bash
set -Eeuo pipefail

ADMIN_SHA="${ADMIN_SHA:-d10dd517bbf806bae0a92d53383e0c6d620ba523}"
PRIVACY_SHA="${PRIVACY_SHA:-bf9d6f42cba961169c5d6e0aaa24b07a64ba6c01}"
JOBS_SHA="${JOBS_SHA:-1515ff2bbf66f764d125eb2abe7b615c88cedb59}"
CONTROL_BRANCH='workstream-c-manual-verification-20260711'
PUBLIC_REGISTRY='https://registry.npmjs.org/'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
MIN_FREE_KB="${WORKSTREAM_C_MIN_FREE_KB:-8388608}"
SHA_PATTERN='^[0-9a-f]{40}$'

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[workstream-c-cloud-shell] FAIL: $*" >&2; exit 1; }

for candidate in "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"; do
  [[ "$candidate" =~ $SHA_PATTERN ]] || fail "Candidate identity must be a full lowercase SHA: $candidate"
done
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail 'Verifier checkout must be clean'
CONTROL_SHA="$(git -C "$CONTROL_ROOT" rev-parse HEAD)"
[[ "$CONTROL_SHA" =~ $SHA_PATTERN ]] || fail 'Verifier checkout SHA is invalid'
REMOTE_CONTROL_SHA="$(git -C "$CONTROL_ROOT" ls-remote origin "refs/heads/$CONTROL_BRANCH" | awk '{print $1}')"
[ "$REMOTE_CONTROL_SHA" = "$CONTROL_SHA" ] || fail "Verifier checkout is not the current remote control head: local=$CONTROL_SHA remote=${REMOTE_CONTROL_SHA:-missing}"
[ -f "$CONTROL_ROOT/scripts/resolve-workstream-c-root.mjs" ] || fail 'Workspace resolver is missing'
ROOT="$(node "$CONTROL_ROOT/scripts/resolve-workstream-c-root.mjs" "$STAMP")"

cleanup_old_verifier_data() {
  local base path
  for base in "$HOME" /tmp; do
    [ -d "$base" ] || continue
    while IFS= read -r -d '' path; do
      log "Removing prior verifier workspace: $path"
      rm -rf -- "$path"
    done < <(find "$base" -maxdepth 1 -type d -name 'urai-workstream-c-manual-*' -print0 2>/dev/null)
  done

  rm -rf -- \
    "$HOME/.npm/_cacache" \
    "$HOME/.cache/pnpm" \
    "$HOME/.local/share/pnpm/store" \
    2>/dev/null || true
}

cleanup_old_verifier_data
mkdir -m 700 -p "$ROOT"/{npm-cache,pnpm-store,pip-cache,xdg-config,gcloud-config,firebase-emulators,tmp}
[ -d "$ROOT" ] && [ ! -L "$ROOT" ] || fail 'Verifier workspace must remain a real directory'

free_kb="$(df -Pk /tmp | awk 'NR==2 {print $4}')"
log "Free /tmp workspace: $free_kb KiB"
if [ "$free_kb" -lt "$MIN_FREE_KB" ]; then
  echo "Manual verification requires at least $MIN_FREE_KB KiB free in /tmp; only $free_kb KiB is available." >&2
  exit 28
fi

unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS
export WORKSTREAM_C_ROOT="$ROOT"
export NPM_CONFIG_CACHE="$ROOT/npm-cache"
export npm_config_cache="$ROOT/npm-cache"
export npm_config_store_dir="$ROOT/pnpm-store"
export NPM_CONFIG_REGISTRY="$PUBLIC_REGISTRY"
export npm_config_registry="$PUBLIC_REGISTRY"
export PNPM_HOME="$ROOT/pnpm-home"
export PIP_CACHE_DIR="$ROOT/pip-cache"
export XDG_CONFIG_HOME="$ROOT/xdg-config"
export CLOUDSDK_CONFIG="$ROOT/gcloud-config"
export FIREBASE_EMULATORS_PATH="$ROOT/firebase-emulators"
export TMPDIR="$ROOT/tmp"
export NO_GCE_CHECK=true
export CI=1

log "Verifier control head: $CONTROL_SHA"
log "Cloud Shell verifier workspace: $ROOT"
log "Admin: $ADMIN_SHA"
log "Privacy: $PRIVACY_SHA"
log "Jobs: $JOBS_SHA"

exec env \
  ADMIN_SHA="$ADMIN_SHA" \
  PRIVACY_SHA="$PRIVACY_SHA" \
  JOBS_SHA="$JOBS_SHA" \
  bash "$(dirname "$0")/run-workstream-c-manual-verification.sh"
