#!/usr/bin/env bash
set -Eeuo pipefail

ADMIN_SHA="${ADMIN_SHA:-6d1e84640544098ae71040fca4c7f8893e0f2fd4}"
PRIVACY_SHA="${PRIVACY_SHA:-371e9a8db9b24a0cbdd3a6753776be6920ce736c}"
JOBS_SHA="${JOBS_SHA:-ed7f80517e4fa940472a93f22e9d42e080ddeb6c}"
JOBS_LOCAL_SOURCE="${JOBS_LOCAL_SOURCE:-}"
CONTROL_REF="${WORKSTREAM_C_CONTROL_REF:-${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-workstream-c-manual-verification-20260711}}}"
PUBLIC_REGISTRY='https://registry.npmjs.org/'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
MIN_FREE_KB="${WORKSTREAM_C_MIN_FREE_KB:-8388608}"
SHA_PATTERN='^[0-9a-f]{40}$'
REPINS_PATTERN='^repin/current-core-candidates-[0-9]{8}$'
ORIGINAL_HOME="${HOME:?HOME must be set}"
HOST_NVM_DIR="${NVM_DIR:-$ORIGINAL_HOME/.nvm}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[workstream-c-cloud-shell] FAIL: $*" >&2; exit 1; }

for candidate in "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"; do
  [[ "$candidate" =~ $SHA_PATTERN ]] || fail "Candidate identity must be a full lowercase SHA: $candidate"
done
if [ "$CONTROL_REF" != 'workstream-c-manual-verification-20260711' ] && [[ ! "$CONTROL_REF" =~ $REPINS_PATTERN ]]; then
  fail "Control ref is outside the bounded verifier authority: $CONTROL_REF"
fi
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail 'Verifier checkout must be clean'
CONTROL_SHA="$(git -C "$CONTROL_ROOT" rev-parse HEAD)"
[[ "$CONTROL_SHA" =~ $SHA_PATTERN ]] || fail 'Verifier checkout SHA is invalid'
REMOTE_CONTROL_SHA="$(git -C "$CONTROL_ROOT" ls-remote origin "refs/heads/$CONTROL_REF" | awk '{print $1}')"
[ "$REMOTE_CONTROL_SHA" = "$CONTROL_SHA" ] || fail "Verifier checkout is not the current remote control head: ref=$CONTROL_REF local=$CONTROL_SHA remote=${REMOTE_CONTROL_SHA:-missing}"
[ -f "$CONTROL_ROOT/scripts/resolve-workstream-c-root.mjs" ] || fail 'Workspace resolver is missing'
ROOT="$(node "$CONTROL_ROOT/scripts/resolve-workstream-c-root.mjs" "$STAMP")"

cleanup_old_verifier_data() {
  local base path
  for base in "$ORIGINAL_HOME" /tmp; do
    [ -d "$base" ] || continue
    while IFS= read -r -d '' path; do
      log "Removing prior verifier workspace: $path"
      rm -rf -- "$path"
    done < <(find "$base" -maxdepth 1 -type d -name 'urai-workstream-c-manual-*' -print0 2>/dev/null)
  done

  rm -rf -- \
    "$ORIGINAL_HOME/.npm/_cacache" \
    "$ORIGINAL_HOME/.cache/pnpm" \
    "$ORIGINAL_HOME/.local/share/pnpm/store" \
    2>/dev/null || true
}

cleanup_old_verifier_data
[ -s "$HOST_NVM_DIR/nvm.sh" ] || fail "nvm is required at $HOST_NVM_DIR"
mkdir -m 700 -p "$ROOT"/{home,npm-cache,pnpm-store,pip-cache,xdg-config,gcloud-config,firebase-emulators,tmp}
[ -d "$ROOT" ] && [ ! -L "$ROOT" ] || fail 'Verifier workspace must remain a real directory'
ln -s "$HOST_NVM_DIR" "$ROOT/home/.nvm"

free_kb="$(df -Pk /tmp | awk 'NR==2 {print $4}')"
log "Free /tmp workspace: $free_kb KiB"
if [ "$free_kb" -lt "$MIN_FREE_KB" ]; then
  echo "Manual verification requires at least $MIN_FREE_KB KiB free in /tmp; only $free_kb KiB is available." >&2
  exit 28
fi

unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS
export WORKSTREAM_C_CONFINED=1
export WORKSTREAM_C_CONTROL_REF="$CONTROL_REF"
export WORKSTREAM_C_ROOT="$ROOT"
export HOME="$ROOT/home"
export NVM_DIR="$HOME/.nvm"
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

[ "$HOME" = "$ROOT/home" ] || fail 'Verifier HOME must be confined under the workspace'
[ ! -e "$HOME/.config/gcloud/application_default_credentials.json" ] || fail 'Ambient Google ADC must not be reachable from confined HOME'

log "Verifier control ref: $CONTROL_REF"
log "Verifier control head: $CONTROL_SHA"
log "Cloud Shell verifier workspace: $ROOT"
log "Confined HOME: $HOME"
log "Admin: $ADMIN_SHA"
log "Privacy: $PRIVACY_SHA"
log "Jobs: $JOBS_SHA"
if [ -n "$JOBS_LOCAL_SOURCE" ]; then
  log "Jobs source: confined local pre-push candidate $JOBS_LOCAL_SOURCE"
fi

exec env \
  WORKSTREAM_C_CONFINED=1 \
  WORKSTREAM_C_CONTROL_REF="$CONTROL_REF" \
  WORKSTREAM_C_ROOT="$ROOT" \
  HOME="$HOME" \
  NVM_DIR="$NVM_DIR" \
  ADMIN_SHA="$ADMIN_SHA" \
  PRIVACY_SHA="$PRIVACY_SHA" \
  JOBS_SHA="$JOBS_SHA" \
  JOBS_LOCAL_SOURCE="$JOBS_LOCAL_SOURCE" \
  bash "$(dirname "$0")/run-workstream-c-manual-verification-core.sh"
