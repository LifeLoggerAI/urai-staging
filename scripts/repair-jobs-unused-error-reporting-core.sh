#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_JOBS_SHA='ed7f80517e4fa940472a93f22e9d42e080ddeb6c'
ADMIN_SHA='6d1e84640544098ae71040fca4c7f8893e0f2fd4'
PRIVACY_SHA='371e9a8db9b24a0cbdd3a6753776be6920ce736c'
JOBS_BRANCH='secure-worker-deploy-20260706'
CONTROL_BRANCH='workstream-c-manual-verification-20260711'
RUN_FULL_VERIFIER_AFTER_REPAIR="${RUN_FULL_VERIFIER_AFTER_REPAIR:-1}"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
SHA_PATTERN='^[0-9a-f]{40}$'
PUBLIC_REGISTRY='https://registry.npmjs.org/'

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[repair-jobs-dependency] FAIL: $*" >&2; exit 1; }

safe_root() {
  local requested resolved parent name
  if [ -n "${JOBS_REPAIR_ROOT:-}" ]; then
    requested="$JOBS_REPAIR_ROOT"
    resolved="$(realpath -m -- "$requested")"
    parent="$(dirname -- "$resolved")"
    name="$(basename -- "$resolved")"
    [ "$parent" = '/tmp' ] || fail 'JOBS_REPAIR_ROOT must resolve directly below /tmp'
    case "$name" in urai-jobs-dependency-repair-*) ;; *) fail 'JOBS_REPAIR_ROOT basename must start with urai-jobs-dependency-repair-' ;; esac
    if [ -e "$resolved" ] || [ -L "$resolved" ]; then
      [ ! -L "$resolved" ] || fail 'JOBS_REPAIR_ROOT must not be a symbolic link'
      [ -d "$resolved" ] || fail 'JOBS_REPAIR_ROOT must be a directory when it exists'
      rm -rf -- "$resolved"
    fi
    mkdir -m 700 -- "$resolved"
    printf '%s\n' "$resolved"
    return
  fi
  mktemp -d /tmp/urai-jobs-dependency-repair-XXXXXXXX
}

for candidate in "$EXPECTED_JOBS_SHA" "$ADMIN_SHA" "$PRIVACY_SHA"; do
  [[ "$candidate" =~ $SHA_PATTERN ]] || fail "Invalid exact candidate SHA: $candidate"
done
[ "$RUN_FULL_VERIFIER_AFTER_REPAIR" = '1' ] || fail 'Remote mutation is forbidden unless the complete Workstream C verifier is enabled'
[ -f "$CONTROL_ROOT/scripts/run-workstream-c-cloud-shell.sh" ] || fail 'Run this script from the urai-staging verifier checkout'
[ -f "$CONTROL_ROOT/scripts/validate-jobs-narrator-build-input.mjs" ] || fail 'Narrator build-input validator is missing'
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail 'The verifier checkout must be clean'
command -v git >/dev/null || fail 'git is required'
command -v gh >/dev/null || fail 'GitHub CLI is required'
command -v realpath >/dev/null || fail 'realpath is required'
gh auth status >/dev/null 2>&1 || fail 'GitHub CLI authentication is required'

CONTROL_SHA="$(git -C "$CONTROL_ROOT" rev-parse HEAD)"
[[ "$CONTROL_SHA" =~ $SHA_PATTERN ]] || fail 'Verifier checkout SHA is invalid'
CONTROL_REMOTE_SHA="$(git -C "$CONTROL_ROOT" ls-remote origin "refs/heads/$CONTROL_BRANCH" | awk '{print $1}')"
[ "$CONTROL_REMOTE_SHA" = "$CONTROL_SHA" ] || fail "Verifier checkout is not the exact remote control head: local=$CONTROL_SHA remote=${CONTROL_REMOTE_SHA:-missing}"

if ! command -v nvm >/dev/null 2>&1; then
  [ -s "$HOME/.nvm/nvm.sh" ] || fail 'nvm is required'
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
nvm install 22
nvm use 22
command -v node >/dev/null || fail 'Node 22 is unavailable'
command -v npm >/dev/null || fail 'npm is unavailable'

ROOT="$(safe_root)"
REPO="$ROOT/urai-jobs"
TOOLING="$ROOT/tooling"
AUDIT_DIR="$ROOT/audit"
mkdir -m 700 -p "$TOOLING" "$AUDIT_DIR"

log "Verifier control head: $CONTROL_SHA"
log "Repair root: $ROOT"
log "Cloning Jobs branch $JOBS_BRANCH"
git clone --branch "$JOBS_BRANCH" --single-branch https://github.com/LifeLoggerAI/urai-jobs.git "$REPO"
cd "$REPO"

[ "$(git remote get-url origin)" = 'https://github.com/LifeLoggerAI/urai-jobs.git' ] || fail 'Jobs origin is not canonical'
[ "$(git rev-parse HEAD)" = "$EXPECTED_JOBS_SHA" ] || fail "Jobs head moved from $EXPECTED_JOBS_SHA"
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Jobs checkout is not clean'

unexpected_error_reporting_refs="$(git grep -n '@google-cloud/error-reporting' -- . 2>/dev/null | grep -Ev '^(functions/package\.json|functions/package-lock\.json|pnpm-lock\.yaml|\.pnpm/lock\.yaml|_audit/)' || true)"
[ -z "$unexpected_error_reporting_refs" ] || fail "Runtime/source references exist for error reporting:\n$unexpected_error_reporting_refs"
git grep -n 'firebase-admin' -- workers/asset-worker/index.js >/dev/null || fail 'asset-worker must retain Firebase Admin'
node "$CONTROL_ROOT/scripts/validate-jobs-narrator-build-input.mjs" "$REPO"

UNUSED_FIREBASE_REF="$ROOT/unused-firebase-ref.txt"
for worker in spatial-worker studio-worker; do
  if git grep -n 'firebase-admin' -- "workers/$worker" 2>/dev/null | grep -v '/package.json:' >"$UNUSED_FIREBASE_REF"; then
    cat "$UNUSED_FIREBASE_REF" >&2
    fail "firebase-admin is used by $worker; refusing dependency removal"
  fi
done
rm -f -- "$UNUSED_FIREBASE_REF"

log 'Installing private pnpm 8.15.9'
npm install --global --prefix "$TOOLING/pnpm" pnpm@8.15.9 --registry="$PUBLIC_REGISTRY"
export PATH="$TOOLING/pnpm/bin:$PATH"
export npm_config_registry="$PUBLIC_REGISTRY"
[ "$(pnpm --version)" = '8.15.9' ] || fail 'Unexpected pnpm version'

log 'Applying the deployed-source-correct audited manifest repair'
node <<'NODE'
const fs = require('node:fs');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, value) => fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
const overrides = {
  protobufjs: '7.6.5',
  'protobufjs-cli': '1.3.3',
  '@grpc/grpc-js': '1.14.4',
  uuid: '11.1.1',
};
const root = read('package.json');
root.pnpm = { ...(root.pnpm || {}), overrides: { ...((root.pnpm || {}).overrides || {}), ...overrides } };
write('package.json', root);
const functions = read('functions/package.json');
if (!functions.dependencies?.['@google-cloud/error-reporting']) throw new Error('@google-cloud/error-reporting is not present in functions/package.json');
delete functions.dependencies['@google-cloud/error-reporting'];
functions.overrides = { ...(functions.overrides || {}), ...overrides };
write('functions/package.json', functions);
const asset = read('workers/asset-worker/package.json');
if (!asset.dependencies?.['firebase-admin']) throw new Error('asset-worker must declare firebase-admin');
asset.dependencies['firebase-admin'] = '^12.7.0';
write('workers/asset-worker/package.json', asset);
for (const worker of ['narrator-worker', 'spatial-worker', 'studio-worker']) {
  const file = `workers/${worker}/package.json`;
  const pkg = read(file);
  if (!pkg.dependencies?.['firebase-admin']) throw new Error(`${file} does not declare firebase-admin`);
  delete pkg.dependencies['firebase-admin'];
  write(file, pkg);
}
NODE

node "$CONTROL_ROOT/scripts/validate-jobs-narrator-build-input.mjs" "$REPO"

log 'Regenerating public-registry npm and pnpm locks'
npm install --prefix functions --package-lock-only --ignore-scripts --audit=false --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts --registry="$PUBLIC_REGISTRY"
mkdir -p .pnpm
cp pnpm-lock.yaml .pnpm/lock.yaml
! grep -R 'packages.applied-caas\|internal.api.openai' functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml || fail 'Internal registry URL leaked into a lockfile'
cmp -s pnpm-lock.yaml .pnpm/lock.yaml || fail '.pnpm lock mirror differs from canonical lock'
! grep -q '"@google-cloud/error-reporting"' functions/package.json
! grep -q '"@google-cloud/error-reporting"' functions/package-lock.json

log 'Running deterministic installs and zero-finding audits'
npm ci --prefix functions --ignore-scripts --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --frozen-lockfile --ignore-scripts --registry="$PUBLIC_REGISTRY"
set +e
npm --prefix functions audit --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-full.json"; FULL_AUDIT_EXIT=$?
npm --prefix functions audit --omit=dev --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-production.json"; PROD_AUDIT_EXIT=$?
pnpm audit --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/workspace-pnpm-audit.json"; PNPM_AUDIT_EXIT=$?
set -e
node - "$AUDIT_DIR/functions-audit-full.json" "$AUDIT_DIR/functions-audit-production.json" "$AUDIT_DIR/workspace-pnpm-audit.json" <<'NODE'
const fs = require('node:fs');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
for (const file of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const counts = report?.metadata?.vulnerabilities;
  if (!counts || typeof counts !== 'object') throw new Error(`${file} lacks metadata.vulnerabilities`);
  const nonzero = severities.filter((severity) => Number(counts[severity] || 0) !== 0);
  if (nonzero.length) throw new Error(`${file} has nonzero findings: ${nonzero.join(', ')}`);
}
NODE
[ "$FULL_AUDIT_EXIT" -eq 0 ] || fail "Functions full audit exited $FULL_AUDIT_EXIT"
[ "$PROD_AUDIT_EXIT" -eq 0 ] || fail "Functions production audit exited $PROD_AUDIT_EXIT"
[ "$PNPM_AUDIT_EXIT" -eq 0 ] || fail "Workspace pnpm audit exited $PNPM_AUDIT_EXIT"

log 'Running local Jobs module/source/build/test gates'
node --input-type=module -e "Promise.all([import('firebase-admin'), import('@google-cloud/pubsub'), import('@google-cloud/storage')]).then(() => console.log('functions module load passed'))"
node -e "require('./workers/asset-worker/node_modules/firebase-admin'); console.log('asset Firebase Admin load passed')"
node "$CONTROL_ROOT/scripts/validate-jobs-narrator-build-input.mjs" "$REPO"
pnpm ci:exact-head
pnpm urai-jobs:verify
pnpm typecheck
pnpm build
test -f workers/narrator-worker/dist/index.js || fail 'Narrator build output is missing'
if grep -R -n 'firebase-admin' workers/narrator-worker/dist; then fail 'Narrator build output unexpectedly references firebase-admin'; fi
pnpm test

[ ! -L docs ] || fail 'docs must not be a symbolic link'
mkdir -p docs/release-evidence
[ ! -L docs/release-evidence ] || fail 'docs/release-evidence must not be a symbolic link'
RECEIPT_PATH='docs/release-evidence/jobs-dependency-audit-receipt-20260711.json'
[ ! -e "$RECEIPT_PATH" ] && [ ! -L "$RECEIPT_PATH" ] || fail 'Dependency audit receipt already exists'
FULL_AUDIT_EXIT="$FULL_AUDIT_EXIT" PROD_AUDIT_EXIT="$PROD_AUDIT_EXIT" PNPM_AUDIT_EXIT="$PNPM_AUDIT_EXIT" \
node - "$EXPECTED_JOBS_SHA" "$CONTROL_SHA" "$AUDIT_DIR" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const [previousHead, controlSha, auditDir] = process.argv.slice(2);
const files = [
  'package.json', 'functions/package.json', 'functions/package-lock.json', 'pnpm-lock.yaml', '.pnpm/lock.yaml',
  'workers/asset-worker/package.json', 'workers/narrator-worker/package.json',
  'workers/spatial-worker/package.json', 'workers/studio-worker/package.json',
];
const digest = (file) => {
  const data = fs.readFileSync(file);
  return { sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length };
};
const auditFiles = {
  functionsFull: `${auditDir}/functions-audit-full.json`,
  functionsProduction: `${auditDir}/functions-audit-production.json`,
  workspacePnpm: `${auditDir}/workspace-pnpm-audit.json`,
};
const counts = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).metadata.vulnerabilities;
const receipt = {
  schema: 'urai-jobs-dependency-audit-receipt-5',
  receiptId: 'URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-016',
  generatedAt: new Date().toISOString(),
  repository: 'LifeLoggerAI/urai-jobs',
  pullRequest: 75,
  controlRepository: 'LifeLoggerAI/urai-staging',
  controlSha,
  previousHead,
  sourceCorrection: {
    retainedFirebaseAdminWorkers: ['asset-worker'],
    removedUnusedFirebaseAdminWorkers: ['narrator-worker', 'spatial-worker', 'studio-worker'],
    removedUnusedDependency: '@google-cloud/error-reporting',
  },
  auditResults: Object.fromEntries(Object.entries(auditFiles).map(([name, file]) => [name, {
    exitCode: Number(process.env[name === 'functionsFull' ? 'FULL_AUDIT_EXIT' : name === 'functionsProduction' ? 'PROD_AUDIT_EXIT' : 'PNPM_AUDIT_EXIT']),
    vulnerabilities: counts(file),
    report: digest(file),
  }])),
  verification: { deterministicInstalls: 'pass', publicRegistryOnly: 'pass', moduleLoad: 'pass', narratorBuildInput: 'pass', sourceContracts: 'pass', typecheck: 'pass', build: 'pass', tests: 'pass' },
  artifactHashes: Object.fromEntries(files.map((file) => [file, digest(file)])),
  publicationGate: 'The commit and this receipt may be pushed only after the complete confined Admin/Privacy/Jobs verifier passes on the exact local candidate commit.',
  mutations: { deployment: false, providerCall: false, billing: false, secretMutation: false, infrastructure: false, productionData: false, merge: false },
  releaseConclusion: 'NOT AUTHORIZED - independent review and protected staging/runtime/rollback evidence remain required.',
};
fs.writeFileSync('docs/release-evidence/jobs-dependency-audit-receipt-20260711.json', `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
NODE

allowed='^( M|M |A |\?\?) (package.json|functions/package.json|functions/package-lock.json|pnpm-lock.yaml|\.pnpm/lock.yaml|workers/asset-worker/package.json|workers/narrator-worker/package.json|workers/spatial-worker/package.json|workers/studio-worker/package.json|docs/release-evidence/jobs-dependency-audit-receipt-20260711.json)$'
status="$(git status --porcelain --untracked-files=all)"
[ -n "$status" ] || fail 'Dependency repair produced no changes'
while IFS= read -r line; do [[ "$line" =~ $allowed ]] || fail "Unexpected repository change: $line"; done <<< "$status"
git diff --check

log 'Committing the exact audited set locally; remote mutation remains blocked'
GH_LOGIN="$(gh api user --jq .login)"
GH_ID="$(gh api user --jq .id)"
[ -n "$GH_LOGIN" ] && [ -n "$GH_ID" ] || fail 'Could not resolve GitHub identity'
git config user.name "${GIT_AUTHOR_NAME:-$GH_LOGIN}"
git config user.email "${GIT_AUTHOR_EMAIL:-${GH_ID}+${GH_LOGIN}@users.noreply.github.com}"
git add package.json functions/package.json functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml \
  workers/asset-worker/package.json workers/narrator-worker/package.json \
  workers/spatial-worker/package.json workers/studio-worker/package.json \
  docs/release-evidence/jobs-dependency-audit-receipt-20260711.json
git commit -m 'fix(jobs): eliminate dependency audit findings'
NEW_SHA="$(git rev-parse HEAD)"
[[ "$NEW_SHA" =~ $SHA_PATTERN ]] || fail 'Local repaired Jobs commit SHA is invalid'
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Jobs checkout changed after local commit'

log "Running complete confined Workstream C verifier against local candidate $NEW_SHA before any push"
cd "$CONTROL_ROOT"
ADMIN_SHA="$ADMIN_SHA" \
PRIVACY_SHA="$PRIVACY_SHA" \
JOBS_SHA="$NEW_SHA" \
JOBS_LOCAL_SOURCE="$REPO" \
bash scripts/run-workstream-c-cloud-shell.sh

cd "$REPO"
[ "$(git rev-parse HEAD)" = "$NEW_SHA" ] || fail 'Local Jobs candidate changed during full verification'
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Local Jobs candidate is dirty after full verification'
REMOTE_SHA="$(git ls-remote origin "refs/heads/$JOBS_BRANCH" | awk '{print $1}')"
[ "$REMOTE_SHA" = "$EXPECTED_JOBS_SHA" ] || fail "Remote Jobs head moved to $REMOTE_SHA; refusing push"
CONTROL_REMOTE_SHA="$(git -C "$CONTROL_ROOT" ls-remote origin "refs/heads/$CONTROL_BRANCH" | awk '{print $1}')"
[ "$CONTROL_REMOTE_SHA" = "$CONTROL_SHA" ] || fail 'Control branch moved during verification; refusing push'

gh auth setup-git >/dev/null
git push origin "HEAD:$JOBS_BRANCH"

gh pr comment 75 --repo LifeLoggerAI/urai-jobs --body "Dependency repair completed at exact head \`$NEW_SHA\` only after the complete confined Admin/Privacy/Jobs verifier passed on that same local commit. Receipt: \`URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-016\`. No deployment, provider call, infrastructure or production-data mutation occurred." || true

cat <<EOF

JOBS DEPENDENCY REPAIR: PASS
Control head:  $CONTROL_SHA
Previous head: $EXPECTED_JOBS_SHA
New head:      $NEW_SHA
Receipt:       $RECEIPT_PATH

The remote branch and receipt were published only after deployed-input validation, zero audit findings, frozen installs, Jobs source/type/build/test gates, and the complete confined Admin/Privacy/Jobs verifier passed on the exact local candidate commit.
EOF
