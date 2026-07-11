#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_JOBS_SHA='1515ff2bbf66f764d125eb2abe7b615c88cedb59'
JOBS_BRANCH='secure-worker-deploy-20260706'
CONTROL_BRANCH='workstream-c-manual-verification-20260711'
RUN_FULL_VERIFIER_AFTER_REPAIR="${RUN_FULL_VERIFIER_AFTER_REPAIR:-1}"
CONTROL_ROOT="$(git rev-parse --show-toplevel)"
TOOLING=''
AUDIT_DIR=''
REPO=''
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
    case "$name" in
      urai-jobs-dependency-repair-*) ;;
      *) fail 'JOBS_REPAIR_ROOT basename must start with urai-jobs-dependency-repair-' ;;
    esac
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

[[ "$EXPECTED_JOBS_SHA" =~ $SHA_PATTERN ]] || fail 'Internal expected Jobs SHA is invalid'
[ -f "$CONTROL_ROOT/scripts/run-workstream-c-cloud-shell.sh" ] || fail 'Run this script from the urai-staging verifier checkout'
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
ACTUAL_SHA="$(git rev-parse HEAD)"
[ "$ACTUAL_SHA" = "$EXPECTED_JOBS_SHA" ] || fail "Jobs head moved: expected $EXPECTED_JOBS_SHA, found $ACTUAL_SHA"
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Jobs checkout is not clean'

unexpected_error_reporting_refs="$(git grep -n '@google-cloud/error-reporting' -- . 2>/dev/null | grep -Ev '^(functions/package\.json|functions/package-lock\.json|pnpm-lock\.yaml|\.pnpm/lock\.yaml|_audit/)' || true)"
[ -z "$unexpected_error_reporting_refs" ] || fail "Runtime/source references exist for error reporting:\n$unexpected_error_reporting_refs"

# Source truth: asset and narrator workers use Firebase Admin and must retain it.
for worker_source in workers/asset-worker/index.js workers/narrator-worker/index.js; do
  git grep -n 'firebase-admin' -- "$worker_source" >/dev/null || fail "$worker_source must retain Firebase Admin"
done

# Spatial and studio workers do not use Firebase Admin; their declarations may be removed.
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

log 'Applying the source-correct audited manifest repair'
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
root.pnpm = {
  ...(root.pnpm || {}),
  overrides: { ...((root.pnpm || {}).overrides || {}), ...overrides },
};
write('package.json', root);

const functions = read('functions/package.json');
if (!functions.dependencies?.['@google-cloud/error-reporting']) {
  throw new Error('@google-cloud/error-reporting is not present in functions/package.json');
}
delete functions.dependencies['@google-cloud/error-reporting'];
functions.overrides = { ...(functions.overrides || {}), ...overrides };
write('functions/package.json', functions);

for (const worker of ['asset-worker', 'narrator-worker']) {
  const path = `workers/${worker}/package.json`;
  const pkg = read(path);
  if (!pkg.dependencies?.['firebase-admin']) {
    throw new Error(`${path} must declare firebase-admin`);
  }
  pkg.dependencies['firebase-admin'] = '^12.7.0';
  write(path, pkg);
}

for (const worker of ['spatial-worker', 'studio-worker']) {
  const path = `workers/${worker}/package.json`;
  const pkg = read(path);
  if (!pkg.dependencies?.['firebase-admin']) {
    throw new Error(`${path} does not declare firebase-admin`);
  }
  delete pkg.dependencies['firebase-admin'];
  write(path, pkg);
}
NODE

log 'Regenerating public-registry npm and pnpm locks'
npm install --prefix functions --package-lock-only --ignore-scripts --audit=false --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts --registry="$PUBLIC_REGISTRY"
mkdir -p .pnpm
cp pnpm-lock.yaml .pnpm/lock.yaml

! grep -R 'packages.applied-caas\|internal.api.openai' functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml || fail 'Internal registry URL leaked into a lockfile'
cmp -s pnpm-lock.yaml .pnpm/lock.yaml || fail '.pnpm lock mirror differs from canonical lock'
! grep -q '"@google-cloud/error-reporting"' functions/package.json
! grep -q '"@google-cloud/error-reporting"' functions/package-lock.json

log 'Running deterministic installs'
npm ci --prefix functions --ignore-scripts --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --frozen-lockfile --ignore-scripts --registry="$PUBLIC_REGISTRY"

log 'Capturing npm and pnpm audit reports'
set +e
npm --prefix functions audit --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-full.json"
FULL_AUDIT_EXIT=$?
npm --prefix functions audit --omit=dev --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-production.json"
PROD_AUDIT_EXIT=$?
pnpm audit --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/workspace-pnpm-audit.json"
PNPM_AUDIT_EXIT=$?
set -e

node - "$AUDIT_DIR/functions-audit-full.json" "$AUDIT_DIR/functions-audit-production.json" "$AUDIT_DIR/workspace-pnpm-audit.json" <<'NODE'
const fs = require('node:fs');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  const counts = report?.metadata?.vulnerabilities;
  if (!counts || typeof counts !== 'object') {
    throw new Error(`${path} lacks metadata.vulnerabilities; audit result is not trustworthy`);
  }
  for (const severity of severities) {
    if (!Number.isFinite(Number(counts[severity] ?? 0))) {
      throw new Error(`${path} has invalid ${severity} vulnerability count`);
    }
  }
  console.log(`${path}: ${JSON.stringify(counts)}`);
  const nonzero = severities.filter((severity) => Number(counts[severity] || 0) !== 0);
  if (nonzero.length) {
    const findings = Object.entries(report.vulnerabilities ?? report.advisories ?? {})
      .filter(([, value]) => nonzero.includes(value?.severity))
      .map(([name, value]) => ({ name, severity: value.severity, via: value.via, range: value.range, fixAvailable: value.fixAvailable }));
    console.error(JSON.stringify(findings, null, 2));
    process.exitCode = 1;
  }
}
NODE
[ "$FULL_AUDIT_EXIT" -eq 0 ] || fail "Functions full audit exited $FULL_AUDIT_EXIT despite zero parsed findings"
[ "$PROD_AUDIT_EXIT" -eq 0 ] || fail "Functions production audit exited $PROD_AUDIT_EXIT despite zero parsed findings"
[ "$PNPM_AUDIT_EXIT" -eq 0 ] || fail "Workspace pnpm audit exited $PNPM_AUDIT_EXIT despite zero parsed findings"

log 'Running module-load and source/build/test gates'
node --input-type=module -e "Promise.all([import('firebase-admin'), import('@google-cloud/pubsub'), import('@google-cloud/storage')]).then(() => console.log('functions module load passed'))"
node -e "require('./workers/asset-worker/node_modules/firebase-admin'); console.log('asset Firebase Admin load passed')"
node -e "require('./workers/narrator-worker/node_modules/firebase-admin'); console.log('narrator Firebase Admin load passed')"
pnpm ci:exact-head
pnpm urai-jobs:verify
pnpm typecheck
pnpm build
pnpm test

[ ! -L docs ] || fail 'docs must not be a symbolic link'
mkdir -p docs/release-evidence
[ ! -L docs/release-evidence ] || fail 'docs/release-evidence must not be a symbolic link'
[ -d docs/release-evidence ] || fail 'docs/release-evidence must be a directory'
RECEIPT_PATH='docs/release-evidence/jobs-dependency-audit-receipt-20260711.json'
[ ! -e "$RECEIPT_PATH" ] && [ ! -L "$RECEIPT_PATH" ] || fail 'Dependency audit receipt already exists'

FULL_AUDIT_EXIT="$FULL_AUDIT_EXIT" PROD_AUDIT_EXIT="$PROD_AUDIT_EXIT" PNPM_AUDIT_EXIT="$PNPM_AUDIT_EXIT" \
node - "$EXPECTED_JOBS_SHA" "$CONTROL_SHA" "$AUDIT_DIR" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const [previousHead, controlSha, auditDir] = process.argv.slice(2);
const files = [
  'package.json', 'functions/package.json', 'functions/package-lock.json',
  'pnpm-lock.yaml', '.pnpm/lock.yaml',
  'workers/asset-worker/package.json', 'workers/narrator-worker/package.json',
  'workers/spatial-worker/package.json', 'workers/studio-worker/package.json',
];
const digest = (path) => {
  const data = fs.readFileSync(path);
  return { sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length };
};
const artifactHashes = Object.fromEntries(files.map((path) => [path, digest(path)]));
const auditFiles = {
  functionsFull: `${auditDir}/functions-audit-full.json`,
  functionsProduction: `${auditDir}/functions-audit-production.json`,
  workspacePnpm: `${auditDir}/workspace-pnpm-audit.json`,
};
const counts = (path) => JSON.parse(fs.readFileSync(path, 'utf8')).metadata.vulnerabilities;
const receipt = {
  schema: 'urai-jobs-dependency-audit-receipt-3',
  receiptId: 'URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-015',
  generatedAt: new Date().toISOString(),
  repository: 'LifeLoggerAI/urai-jobs',
  pullRequest: 75,
  controlRepository: 'LifeLoggerAI/urai-staging',
  controlSha,
  previousHead,
  sourceCorrection: {
    retainedFirebaseAdminWorkers: ['asset-worker', 'narrator-worker'],
    removedUnusedFirebaseAdminWorkers: ['spatial-worker', 'studio-worker'],
    supersedesPreparedReceipt: 'URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-013',
    failedPreflightReceiptNotIssued: 'URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-014',
  },
  auditResults: Object.fromEntries(Object.entries(auditFiles).map(([name, path]) => [name, {
    exitCode: Number(process.env[name === 'functionsFull' ? 'FULL_AUDIT_EXIT' : name === 'functionsProduction' ? 'PROD_AUDIT_EXIT' : 'PNPM_AUDIT_EXIT']),
    vulnerabilities: counts(path),
    report: digest(path),
  }])),
  verification: {
    deterministicInstalls: 'pass', publicRegistryOnly: 'pass', moduleLoad: 'pass',
    sourceContracts: 'pass', typecheck: 'pass', build: 'pass', tests: 'pass',
  },
  artifactHashes,
  mutations: { deployment: false, providerCall: false, billing: false, secretMutation: false, infrastructure: false, productionData: false, merge: false },
  releaseConclusion: 'NOT AUTHORIZED - independent review and protected staging/runtime/rollback evidence remain required.',
};
fs.writeFileSync('docs/release-evidence/jobs-dependency-audit-receipt-20260711.json', `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
NODE

allowed='^( M|M |A |\?\?) (package.json|functions/package.json|functions/package-lock.json|pnpm-lock.yaml|\.pnpm/lock.yaml|workers/asset-worker/package.json|workers/narrator-worker/package.json|workers/spatial-worker/package.json|workers/studio-worker/package.json|docs/release-evidence/jobs-dependency-audit-receipt-20260711.json)$'
status="$(git status --porcelain --untracked-files=all)"
[ -n "$status" ] || fail 'Dependency repair produced no changes'
while IFS= read -r line; do
  [[ "$line" =~ $allowed ]] || fail "Unexpected repository change: $line"
done <<< "$status"
git diff --check

log 'Configuring commit identity and committing the exact audited set'
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
[ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Jobs checkout changed after commit'

log 'Rechecking remote head immediately before push'
REMOTE_SHA="$(git ls-remote origin "refs/heads/$JOBS_BRANCH" | awk '{print $1}')"
[ "$REMOTE_SHA" = "$EXPECTED_JOBS_SHA" ] || fail "Remote Jobs head moved to $REMOTE_SHA; refusing push"
gh auth setup-git >/dev/null
git push origin "HEAD:$JOBS_BRANCH"

cat <<EOF

JOBS DEPENDENCY REPAIR: PASS
Control head:  $CONTROL_SHA
Previous head: $EXPECTED_JOBS_SHA
New head:      $NEW_SHA
Audit reports: $AUDIT_DIR
Receipt: docs/release-evidence/jobs-dependency-audit-receipt-20260711.json

The branch was pushed only after source-correct worker dependency checks, zero findings at every severity, zero audit command exits, frozen installs, source verification, typecheck, build and tests passed.
EOF

gh pr comment 75 --repo LifeLoggerAI/urai-jobs --body "Dependency repair completed at exact head \`$NEW_SHA\`: narrator and asset workers retained Firebase Admin; only spatial and studio unused declarations were removed; zero npm full, npm production and pnpm workspace findings; audit commands exited zero; frozen installs, source verification, typecheck, build and tests passed. Receipt: \`URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-015\`. No deployment or production mutation occurred." || true

if [ "$RUN_FULL_VERIFIER_AFTER_REPAIR" = '1' ]; then
  log "Starting full Workstream C verifier against repaired Jobs head $NEW_SHA"
  cd "$CONTROL_ROOT"
  JOBS_SHA="$NEW_SHA" bash scripts/run-workstream-c-cloud-shell.sh
fi
