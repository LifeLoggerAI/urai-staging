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

case "${JOBS_REPAIR_PUBLISH:-0}" in
  0|1) ;;
  *)
    echo '[repair-jobs-current-wrapper] JOBS_REPAIR_PUBLISH must be 0 or 1' >&2
    exit 64
    ;;
esac

if [ "${JOBS_REPAIR_PUBLISH:-0}" = '1' ] && [ "${JOBS_REPAIR_PUBLISH_CONFIRM:-}" != 'PUBLISH_VERIFIED_JOBS_REPAIR' ]; then
  echo '[repair-jobs-current-wrapper] publishing requires JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR' >&2
  exit 64
fi

test "$(grep -c '^EXPECTED_JOBS_SHA=' "$CORE")" -eq 1
test "$(grep -c '^ADMIN_SHA=' "$CORE")" -eq 1
test "$(grep -c '^PRIVACY_SHA=' "$CORE")" -eq 1

sed -E \
  -e "s|^EXPECTED_JOBS_SHA='[0-9a-f]{40}'$|EXPECTED_JOBS_SHA='$JOBS_SHA'|" \
  -e "s|^ADMIN_SHA='[0-9a-f]{40}'$|ADMIN_SHA='$ADMIN_SHA'|" \
  -e "s|^PRIVACY_SHA='[0-9a-f]{40}'$|PRIVACY_SHA='$PRIVACY_SHA'|" \
  "$CORE" > "$PATCHED"

python3 - "$PATCHED" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding='utf-8')
push_marker = 'gh auth setup-git >/dev/null\n'
if source.count(push_marker) != 1:
    raise SystemExit('expected exactly one Jobs publish marker')

gate = '''case "${JOBS_REPAIR_PUBLISH:-0}" in
  0)
    cat <<EOF

JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS
Control head:  $CONTROL_SHA
Previous head: $EXPECTED_JOBS_SHA
Local head:    $NEW_SHA
Receipt:       $RECEIPT_PATH

No remote branch, pull request, deployment, provider, billing, credential, infrastructure, or production-data mutation was performed. To publish this exact verified candidate, rerun the official wrapper with JOBS_REPAIR_PUBLISH=1 and JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR while both remote heads remain unchanged.
EOF
    exit 0
    ;;
  1)
    [ "${JOBS_REPAIR_PUBLISH_CONFIRM:-}" = 'PUBLISH_VERIFIED_JOBS_REPAIR' ] || fail 'Explicit Jobs repair publish confirmation is missing'
    ;;
  *)
    fail 'JOBS_REPAIR_PUBLISH must be 0 or 1'
    ;;
esac

gh auth setup-git >/dev/null
'''
source = source.replace(push_marker, gate)
masked_comment = 'gh pr comment 75 --repo LifeLoggerAI/urai-jobs --body "Dependency repair completed at exact head \\`$NEW_SHA\\` only after the complete confined Admin/Privacy/Jobs verifier passed on that same local commit. Receipt: \\`URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-016\\`. No deployment, provider call, infrastructure or production-data mutation occurred." || true'
strict_comment = masked_comment.removesuffix(' || true')
if source.count(masked_comment) != 1:
    raise SystemExit('expected exactly one masked Jobs receipt publication command')
source = source.replace(masked_comment, strict_comment)
path.write_text(source, encoding='utf-8')
PY

grep -Fx "EXPECTED_JOBS_SHA='$JOBS_SHA'" "$PATCHED" >/dev/null
grep -Fx "ADMIN_SHA='$ADMIN_SHA'" "$PATCHED" >/dev/null
grep -Fx "PRIVACY_SHA='$PRIVACY_SHA'" "$PATCHED" >/dev/null
grep -F 'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS' "$PATCHED" >/dev/null
grep -F "JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR" "$PATCHED" >/dev/null
! grep -F 'gh pr comment 75' "$PATCHED" | grep -F '|| true' >/dev/null
chmod 700 "$PATCHED"
JOBS_REPAIR_PUBLISH="${JOBS_REPAIR_PUBLISH:-0}" \
JOBS_REPAIR_PUBLISH_CONFIRM="${JOBS_REPAIR_PUBLISH_CONFIRM:-}" \
bash "$PATCHED" "$@"
