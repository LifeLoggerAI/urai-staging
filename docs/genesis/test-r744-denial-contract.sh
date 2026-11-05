#!/usr/bin/env bash
# Offline R744 fail-closed denial-contract tests. No network/cloud/production actions.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
RUNNER="$ROOT/r744-owner-pinned-acceptance.sh"
[[ -f "$RUNNER" ]] || { echo 'R744 runner missing' >&2; exit 2; }
bash -n "$RUNNER"
helper="$(sed -n '/^expect_denial() {/,/^}/p' "$RUNNER")"
[[ "$helper" == *'grep -Fq'* && "$helper" == *'"$rc" -ne 1'* ]] || { echo 'Fail-closed helper missing' >&2; exit 2; }
# Load only the function under test; the real runner requires an exact GitHub checkout.
eval "$helper"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
record() { local label="$1"; shift; local rc=0; "$@" > "$OUT/$label.log" 2>&1 || rc=$?; return "$rc"; }
accept() { expect_denial "$1" "$2" bash -c "$3" || { echo "Incorrectly denied valid HOLD: $1" >&2; exit 1; }; }
reject() { if expect_denial "$1" "$2" bash -c "$3"; then echo "FALSE GREEN: $1" >&2; exit 1; fi; }
accept valid_privacy '[GENESIS STAGING] BLOCKED: Privacy-to-Jobs staged consumer ownership is not accepted.' 'echo "[GENESIS STAGING] BLOCKED: Privacy-to-Jobs staged consumer ownership is not accepted." >&2; exit 1'
accept valid_protected '[GENESIS STAGING] HOLD: Protected GitHub read-only token is required; no source approval attested' 'echo "[GENESIS STAGING] HOLD: Protected GitHub read-only token is required; no source approval attested" >&2; exit 1'
reject wrong_reason 'Expected protected HOLD' 'echo "Different failure" >&2; exit 1'
reject malformed_exit 'Expected protected HOLD' 'echo "Expected protected HOLD" >&2; exit 2'
reject accidental_success 'Expected protected HOLD' 'echo "Expected protected HOLD" >&2; exit 0'
reject crash_after_message 'Expected protected HOLD' 'echo "Expected protected HOLD" >&2; exit 139'
if expect_denial missing_node_file '[GENESIS STAGING] HOLD: Protected GitHub read-only token is required; no source approval attested' node "$OUT/no-such-file.mjs"; then echo 'FALSE GREEN: missing file' >&2; exit 1; fi
printf 'R744_DENIAL_CONTRACT_PASS 7/7 (2 expected denials accepted; 5 false-green cases rejected)\n'
