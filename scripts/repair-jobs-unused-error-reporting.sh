#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_JOBS_SHA="${EXPECTED_JOBS_SHA:-1515ff2bbf66f764d125eb2abe7b615c88cedb59}"
JOBS_BRANCH="${JOBS_BRANCH:-secure-worker-deploy-20260706}"
RUN_FULL_VERIFIER_AFTER_REPAIR="${RUN_FULL_VERIFIER_AFTER_REPAIR:-1}"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
ROOT="${JOBS_REPAIR_ROOT:-/tmp/urai-jobs-dependency-repair-$(date -u +%Y%m%dT%H%M%SZ)}"
REPO="$ROOT/urai-jobs"
TOOLING="$ROOT/tooling"
AUDIT_DIR="$ROOT/audit"
SHA_PATTERN='^[0-9a-f]{40}$'

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[repair-jobs-dependency] FAIL: $*" >&2; exit 1; }

[[ "$EXPECTED_JOBS_SHA" =~ $SHA_PATTERN ]] || fail "EXPECTED_JOBS_SHA must be a full lowercase SHA"
[ -f "$CONTROL_ROOT/scripts/run-workstream-c-cloud-shell.sh" ] || fail "Run this script from the urai-staging verifier checkout"
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail "The urai-staging verifier checkout must be clean"
command -v git >/dev/null || fail "git is required"
command -v gh >/dev/null || fail "GitHub CLI is required"
gh auth status >/dev/null 2>&1 || fail "GitHub CLI authentication is required"

if ! command -v nvm >/dev/null 2>&1; then
  [ -s "$HOME/.nvm/nvm.sh" ] || fail "nvm is required"
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
nvm install 22
nvm use 22
command -v node >/dev/null || fail "Node 22 is unavailable"
command -v npm >/dev/null || fail "npm is unavailable"

rm -rf -- "$ROOT"
mkdir -p "$TOOLING" "$AUDIT_DIR"

log "Cloning Jobs branch $JOBS_BRANCH"
git clone --branch "$JOBS_BRANCH" --single-branch https://github.com/LifeLoggerAI/urai-jobs.git "$REPO"
cd "$REPO"

ACTUAL_SHA="$(git rev-parse HEAD)"
[ "$ACTUAL_SHA" = "$EXPECTED_JOBS_SHA" ] || fail "Jobs head moved: expected $EXPECTED_JOBS_SHA, found $ACTUAL_SHA"
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail "Jobs checkout is not clean"

unexpected_refs="$(git grep -n '@google-cloud/error-reporting' -- \
  ':!functions/package.json' \
  ':!functions/package-lock.json' \
  ':!pnpm-lock.yaml' \
  ':!.pnpm/lock.yaml' \
  ':!_audit/**' || true)"
[ -z "$unexpected_refs" ] || fail "Runtime/source references exist; refusing removal:\n$unexpected_refs"

log "Installing private pnpm 8.15.9"
npm install --global --prefix "$TOOLING/pnpm" pnpm@8.15.9
export PATH="$TOOLING/pnpm/bin:$PATH"
[ "$(pnpm --version)" = "8.15.9" ] || fail "Unexpected pnpm version"

log "Removing unused Functions dependency"
node <<'NODE'
const fs = require('node:fs');
const path = 'functions/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!pkg.dependencies?.['@google-cloud/error-reporting']) {
  throw new Error('@google-cloud/error-reporting is not present in functions/package.json');
}
delete pkg.dependencies['@google-cloud/error-reporting'];
fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
NODE

log "Regenerating npm Functions lock"
npm install --prefix functions --package-lock-only --ignore-scripts --audit=false

log "Regenerating canonical pnpm lock"
pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts
mkdir -p .pnpm
cp pnpm-lock.yaml .pnpm/lock.yaml

log "Verifying dependency is absent from active manifests and importer locks"
! grep -q '"@google-cloud/error-reporting"' functions/package.json
! grep -q '"@google-cloud/error-reporting"' functions/package-lock.json
! awk '/^  functions:/{inside=1} inside && /^  [^ ]/{if ($0 !~ /^  functions:/) inside=0} inside{print}' pnpm-lock.yaml | grep -q "'@google-cloud/error-reporting'"
cmp -s pnpm-lock.yaml .pnpm/lock.yaml || fail ".pnpm lock mirror differs from canonical pnpm-lock.yaml"

log "Running deterministic installs"
npm ci --prefix functions --ignore-scripts
pnpm install --frozen-lockfile

log "Capturing full and production audit reports"
set +e
npm --prefix functions audit --json > "$AUDIT_DIR/functions-audit-full.json"
FULL_AUDIT_EXIT=$?
npm --prefix functions audit --omit=dev --json > "$AUDIT_DIR/functions-audit-production.json"
PROD_AUDIT_EXIT=$?
set -e

node - "$AUDIT_DIR/functions-audit-full.json" "$AUDIT_DIR/functions-audit-production.json" <<'NODE'
const fs = require('node:fs');
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  const counts = report.metadata?.vulnerabilities ?? {};
  const critical = Object.entries(report.vulnerabilities ?? {})
    .filter(([, value]) => value?.severity === 'critical')
    .map(([name, value]) => ({ name, via: value.via, range: value.range, fixAvailable: value.fixAvailable }));
  console.log(`${path}: ${JSON.stringify(counts)}`);
  if (critical.length > 0) {
    console.error(`${path} critical advisories: ${JSON.stringify(critical, null, 2)}`);
    process.exitCode = 1;
  }
}
NODE

log "Running Jobs source, type and build gates"
pnpm ci:exact-head
pnpm urai-jobs:verify
pnpm typecheck
pnpm build
pnpm test

allowed='^( M|M |A |\?\?) (functions/package.json|functions/package-lock.json|pnpm-lock.yaml|\.pnpm/lock.yaml)$'
status="$(git status --porcelain --untracked-files=all)"
[ -n "$status" ] || fail "Dependency repair produced no tracked changes"
while IFS= read -r line; do
  [[ "$line" =~ $allowed ]] || fail "Unexpected repository change: $line"
done <<< "$status"

git diff --check

log "Configuring commit identity"
GH_LOGIN="$(gh api user --jq .login)"
GH_ID="$(gh api user --jq .id)"
[ -n "$GH_LOGIN" ] || fail "Could not resolve GitHub login"
[ -n "$GH_ID" ] || fail "Could not resolve GitHub user id"
git config user.name "${GIT_AUTHOR_NAME:-$GH_LOGIN}"
git config user.email "${GIT_AUTHOR_EMAIL:-${GH_ID}+${GH_LOGIN}@users.noreply.github.com}"

log "Committing exact lockfile repair"
git add functions/package.json functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml
git commit -m "fix(jobs): remove unused error reporting dependency"
NEW_SHA="$(git rev-parse HEAD)"

log "Pushing only after all gates pass"
gh auth setup-git >/dev/null
git push origin "HEAD:$JOBS_BRANCH"

cat <<EOF

JOBS DEPENDENCY REPAIR: PASS
Previous head: $EXPECTED_JOBS_SHA
New head:      $NEW_SHA
Full audit exit before zero-critical assertion: $FULL_AUDIT_EXIT
Production audit exit before zero-critical assertion: $PROD_AUDIT_EXIT
Audit reports: $AUDIT_DIR

The branch was pushed only after frozen installs, zero-critical assertions, source verification, typecheck, build and tests passed.
EOF

gh pr comment 75 --repo LifeLoggerAI/urai-jobs --body "Dependency repair completed at exact head \`$NEW_SHA\`: removed unused \`@google-cloud/error-reporting\`, regenerated npm/pnpm locks, required zero critical full and production audit findings, and passed frozen installs, source verification, typecheck, build and tests. No deployment or provider mutation occurred." || true

if [ "$RUN_FULL_VERIFIER_AFTER_REPAIR" = "1" ]; then
  log "Starting full Workstream C verifier against repaired Jobs head $NEW_SHA"
  cd "$CONTROL_ROOT"
  JOBS_SHA="$NEW_SHA" bash scripts/run-workstream-c-cloud-shell.sh
fi
