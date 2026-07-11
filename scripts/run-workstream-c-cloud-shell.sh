#!/usr/bin/env bash
set -Eeuo pipefail

ADMIN_SHA="${ADMIN_SHA:-d10dd517bbf806bae0a92d53383e0c6d620ba523}"
PRIVACY_SHA="${PRIVACY_SHA:-bf9d6f42cba961169c5d6e0aaa24b07a64ba6c01}"
JOBS_SHA="${JOBS_SHA:-1515ff2bbf66f764d125eb2abe7b615c88cedb59}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="${WORKSTREAM_C_ROOT:-/tmp/urai-workstream-c-manual-$STAMP}"
MIN_FREE_KB="${WORKSTREAM_C_MIN_FREE_KB:-8388608}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

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
mkdir -p "$ROOT"/{npm-cache,pnpm-store,pip-cache,xdg-config,gcloud-config,firebase-emulators,tmp}

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
export PNPM_HOME="$ROOT/pnpm-home"
export PIP_CACHE_DIR="$ROOT/pip-cache"
export XDG_CONFIG_HOME="$ROOT/xdg-config"
export CLOUDSDK_CONFIG="$ROOT/gcloud-config"
export FIREBASE_EMULATORS_PATH="$ROOT/firebase-emulators"
export TMPDIR="$ROOT/tmp"
export NO_GCE_CHECK=true
export CI=1

log "Cloud Shell verifier workspace: $ROOT"
log "Admin: $ADMIN_SHA"
log "Privacy: $PRIVACY_SHA"
log "Jobs: $JOBS_SHA"

exec env \
  ADMIN_SHA="$ADMIN_SHA" \
  PRIVACY_SHA="$PRIVACY_SHA" \
  JOBS_SHA="$JOBS_SHA" \
  bash "$(dirname "$0")/run-workstream-c-manual-verification.sh"
