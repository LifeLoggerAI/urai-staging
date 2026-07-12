#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/workstream-c-current-candidates.env"
CORE="$SCRIPT_DIR/repair-jobs-unused-error-reporting-core.sh"
PATCHED="$(mktemp /tmp/urai-jobs-repair-current-XXXXXXXX.sh)"
trap 'rm -f -- "$PATCHED"' EXIT

for candidate in "$ADMIN_SHA" "$PRIVACY_SHA" "$JOBS_SHA"; do
  [[ "$candidate" =~ ^[0-9a-f]{40}$ ]] || {
    echo "[repair-jobs-current-wrapper] invalid exact candidate SHA: $candidate" >&2
    exit 64
  }
done

test "$(grep -c '^EXPECTED_JOBS_SHA=' "$CORE")" -eq 1
test "$(grep -c '^ADMIN_SHA=' "$CORE")" -eq 1
test "$(grep -c '^PRIVACY_SHA=' "$CORE")" -eq 1

sed -E \
  -e "s|^EXPECTED_JOBS_SHA='[0-9a-f]{40}'$|EXPECTED_JOBS_SHA='$JOBS_SHA'|" \
  -e "s|^ADMIN_SHA='[0-9a-f]{40}'$|ADMIN_SHA='$ADMIN_SHA'|" \
  -e "s|^PRIVACY_SHA='[0-9a-f]{40}'$|PRIVACY_SHA='$PRIVACY_SHA'|" \
  "$CORE" > "$PATCHED"

grep -Fx "EXPECTED_JOBS_SHA='$JOBS_SHA'" "$PATCHED" >/dev/null
grep -Fx "ADMIN_SHA='$ADMIN_SHA'" "$PATCHED" >/dev/null
grep -Fx "PRIVACY_SHA='$PRIVACY_SHA'" "$PATCHED" >/dev/null
chmod 700 "$PATCHED"
bash "$PATCHED" "$@"
