#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_SHA_OVERRIDE="${ADMIN_SHA-}"
PRIVACY_SHA_OVERRIDE="${PRIVACY_SHA-}"
JOBS_SHA_OVERRIDE="${JOBS_SHA-}"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/workstream-c-current-candidates.env"

[ -z "$ADMIN_SHA_OVERRIDE" ] || ADMIN_SHA="$ADMIN_SHA_OVERRIDE"
[ -z "$PRIVACY_SHA_OVERRIDE" ] || PRIVACY_SHA="$PRIVACY_SHA_OVERRIDE"
[ -z "$JOBS_SHA_OVERRIDE" ] || JOBS_SHA="$JOBS_SHA_OVERRIDE"

for candidate in "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"; do
  [[ "$candidate" =~ ^[0-9a-f]{40}$ ]] || {
    echo "[workstream-c-cloud-shell-wrapper] invalid exact candidate SHA: $candidate" >&2
    exit 64
  }
done

export ADMIN_SHA PRIVACY_SHA JOBS_SHA
exec bash "$SCRIPT_DIR/run-workstream-c-cloud-shell-core.sh" "$@"
