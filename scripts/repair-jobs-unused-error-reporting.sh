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

[ "${JOBS_REPAIR_PUBLISH:-0}" = '0' ] || {
  echo '[repair-jobs-current-wrapper] remote publication is not available from this local verification command' >&2
  exit 64
}

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
import re
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding='utf-8')

source, auth_count = re.subn(
    r"command -v git >/dev/null \|\| fail 'git is required'\n"
    r"command -v gh >/dev/null \|\| fail 'GitHub CLI is required'\n"
    r"command -v realpath >/dev/null \|\| fail 'realpath is required'\n"
    r"gh auth status >/dev/null 2>&1 \|\| fail 'GitHub CLI authentication is required'\n",
    "command -v git >/dev/null || fail 'git is required'\n"
    "command -v realpath >/dev/null || fail 'realpath is required'\n",
    source,
)
if auth_count != 1:
    raise SystemExit('expected exactly one early GitHub authentication block')

source, identity_count = re.subn(
    r"GH_LOGIN=\"\$\(gh api user --jq \.login\)\"\n"
    r"GH_ID=\"\$\(gh api user --jq \.id\)\"\n"
    r"\[ -n \"\$GH_LOGIN\" \] && \[ -n \"\$GH_ID\" \] \|\| fail 'Could not resolve GitHub identity'\n"
    r"git config user\.name \"\$\{GIT_AUTHOR_NAME:-\$GH_LOGIN\}\"\n"
    r"git config user\.email \"\$\{GIT_AUTHOR_EMAIL:-\$\{GH_ID\}\+\$\{GH_LOGIN\}@users\.noreply\.github\.com\}\"\n",
    "git config user.name \"${GIT_AUTHOR_NAME:-URAI Jobs Repair}\"\n"
    "git config user.email \"${GIT_AUTHOR_EMAIL:-actions@users.noreply.github.com}\"\n",
    source,
)
if identity_count != 1:
    raise SystemExit('expected exactly one GitHub-derived local commit identity block')

publish_marker = 'gh auth setup-git >/dev/null\n'
if source.count(publish_marker) != 1:
    raise SystemExit('expected exactly one legacy publication boundary')
source = source.split(publish_marker, 1)[0]
source += '''cat <<EOF

JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS
Control head:  $CONTROL_SHA
Previous head: $EXPECTED_JOBS_SHA
Local head:    $NEW_SHA
Receipt:       $RECEIPT_PATH

No remote branch, pull request, deployment, provider, billing, credential, infrastructure, or production-data mutation was performed. The verified local candidate and receipt remain confined to the temporary repair workspace.
EOF
exit 0
'''
path.write_text(source, encoding='utf-8')
PY

grep -Fx "EXPECTED_JOBS_SHA='$JOBS_SHA'" "$PATCHED" >/dev/null
grep -Fx "ADMIN_SHA='$ADMIN_SHA'" "$PATCHED" >/dev/null
grep -Fx "PRIVACY_SHA='$PRIVACY_SHA'" "$PATCHED" >/dev/null
grep -F 'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS' "$PATCHED" >/dev/null
grep -F 'GIT_AUTHOR_NAME:-URAI Jobs Repair' "$PATCHED" >/dev/null
! grep -F 'gh auth' "$PATCHED" >/dev/null
! grep -F 'gh api' "$PATCHED" >/dev/null
! grep -F 'git push' "$PATCHED" >/dev/null
! grep -F 'gh pr comment' "$PATCHED" >/dev/null
chmod 700 "$PATCHED"
JOBS_REPAIR_PUBLISH=0 bash "$PATCHED" "$@"
