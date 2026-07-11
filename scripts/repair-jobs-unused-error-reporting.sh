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
PUBLIC_REGISTRY='https://registry.npmjs.org/'

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { echo "[repair-jobs-dependency] FAIL: $*" >&2; exit 1; }

[[ "$EXPECTED_JOBS_SHA" =~ $SHA_PATTERN ]] || fail "EXPECTED_JOBS_SHA must be a full lowercase SHA"
[ -f "$CONTROL_ROOT/scripts/run-workstream-c-cloud-shell.sh" ] || fail "Run this script from the urai-staging verifier checkout"
[ -z "$(git -C "$CONTROL_ROOT" status --porcelain --untracked-files=all)" ] || fail "The verifier checkout must be clean"
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

unexpected_error_reporting_refs="$(git grep -n '@google-cloud/error-reporting' -- ':!functions/package.json' ':!functions/package-lock.json' ':!pnpm-lock.yaml' ':!.pnpm/lock.yaml' ':!_audit/**' || true)"
[ -z "$unexpected_error_reporting_refs" ] || fail "Runtime/source references exist for error reporting:\n$unexpected_error_reporting_refs"

for worker in narrator-worker spatial-worker studio-worker; do
  if git grep -n "firebase-admin" -- "workers/$worker" ':!*/package.json' >/tmp/urai-unused-firebase-ref 2>/dev/null; then
    cat /tmp/urai-unused-firebase-ref >&2
    fail "firebase-admin is used by $worker; refusing dependency removal"
  fi
done

git grep -n "firebase-admin" -- workers/asset-worker/index.js >/dev/null || fail "asset-worker must retain Firebase Admin"

log "Installing private pnpm 8.15.9"
npm install --global --prefix "$TOOLING/pnpm" pnpm@8.15.9 --registry="$PUBLIC_REGISTRY"
export PATH="$TOOLING/pnpm/bin:$PATH"
[ "$(pnpm --version)" = "8.15.9" ] || fail "Unexpected pnpm version"

log "Applying the audited manifest repair"
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
root.pnpm = { ...(root.pnpm || {}), overrides };
write('package.json', root);

const functions = read('functions/package.json');
if (!functions.dependencies?.['@google-cloud/error-reporting']) {
  throw new Error('@google-cloud/error-reporting is not present in functions/package.json');
}
delete functions.dependencies['@google-cloud/error-reporting'];
functions.overrides = overrides;
write('functions/package.json', functions);

const asset = read('workers/asset-worker/package.json');
asset.dependencies['firebase-admin'] = '^12.7.0';
write('workers/asset-worker/package.json', asset);

for (const worker of ['narrator-worker', 'spatial-worker', 'studio-worker']) {
  const path = `workers/${worker}/package.json`;
  const pkg = read(path);
  if (!pkg.dependencies?.['firebase-admin']) throw new Error(`${path} does not declare firebase-admin`);
  delete pkg.dependencies['firebase-admin'];
  write(path, pkg);
}
NODE

export npm_config_registry="$PUBLIC_REGISTRY"
pnpm config set registry "$PUBLIC_REGISTRY"

log "Regenerating public-registry npm and pnpm locks"
npm install --prefix functions --package-lock-only --ignore-scripts --audit=false --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts
mkdir -p .pnpm
cp pnpm-lock.yaml .pnpm/lock.yaml

! grep -R "packages.applied-caas\|internal.api.openai" functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml || fail "Internal registry URL leaked into a lockfile"
cmp -s pnpm-lock.yaml .pnpm/lock.yaml || fail ".pnpm lock mirror differs from canonical lock"
! grep -q '"@google-cloud/error-reporting"' functions/package.json
! grep -q '"@google-cloud/error-reporting"' functions/package-lock.json

log "Running deterministic installs"
npm ci --prefix functions --ignore-scripts --workspaces=false --registry="$PUBLIC_REGISTRY"
pnpm install --frozen-lockfile --ignore-scripts

log "Capturing npm and pnpm audit reports"
set +e
npm --prefix functions audit --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-full.json"
FULL_AUDIT_EXIT=$?
npm --prefix functions audit --omit=dev --json --registry="$PUBLIC_REGISTRY" > "$AUDIT_DIR/functions-audit-production.json"
PROD_AUDIT_EXIT=$?
pnpm audit --json > "$AUDIT_DIR/workspace-pnpm-audit.json"
PNPM_AUDIT_EXIT=$?
set -e

node - "$AUDIT_DIR/functions-audit-full.json" "$AUDIT_DIR/functions-audit-production.json" "$AUDIT_DIR/workspace-pnpm-audit.json" <<'NODE'
const fs = require('node:fs');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  const counts = report.metadata?.vulnerabilities ?? {};
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

log "Running module-load and source/build/test gates"
node -e "Promise.all([import('firebase-admin'), import('@google-cloud/pubsub'), import('@google-cloud/storage')]).then(() => console.log('functions module load passed'))" --input-type=module
node -e "require('./workers/asset-worker/node_modules/firebase-admin'); console.log('asset Firebase Admin load passed')"
pnpm ci:exact-head
pnpm urai-jobs:verify
pnpm typecheck
pnpm build
pnpm test

mkdir -p docs/release-evidence
node - "$EXPECTED_JOBS_SHA" "$AUDIT_DIR" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const [previousHead, auditDir] = process.argv.slice(2);
const files = [
  'package.json', 'functions/package.json', 'functions/package-lock.json',
  'pnpm-lock.yaml', '.pnpm/lock.yaml',
  'workers/asset-worker/package.json', 'workers/narrator-worker/package.json',
  'workers/spatial-worker/package.json', 'workers/studio-worker/package.json',
];
const artifactHashes = Object.fromEntries(files.map((path) => {
  const data = fs.readFileSync(path);
  return [path, { sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length }];
}));
const counts = (name) => JSON.parse(fs.readFileSync(`${auditDir}/${name}`, 'utf8')).metadata?.vulnerabilities ?? {};
const receipt = {
  schema: 'urai-jobs-dependency-audit-receipt-1',
  receiptId: 'URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-013',
  generatedAt: new Date().toISOString(),
  repository: 'LifeLoggerAI/urai-jobs',
  pullRequest: 75,
  previousHead,
  auditResults: {
    functionsFull: counts('functions-audit-full.json'),
    functionsProduction: counts('functions-audit-production.json'),
    workspacePnpm: counts('workspace-pnpm-audit.json'),
  },
  verification: {
    deterministicInstalls: 'pass', publicRegistryOnly: 'pass', moduleLoad: 'pass',
    sourceContracts: 'pass', typecheck: 'pass', build: 'pass', tests: 'pass',
  },
  artifactHashes,
  mutations: { deployment: false, providerCall: false, billing: false, secretMutation: false, infrastructure: false, productionData: false, merge: false },
  releaseConclusion: 'NOT AUTHORIZED — independent review and protected staging/runtime/rollback evidence remain required.',
};
fs.writeFileSync('docs/release-evidence/jobs-dependency-audit-receipt-20260711.json', `${JSON.stringify(receipt, null, 2)}\n`);
NODE

allowed='^( M|M |A |\?\?) (package.json|functions/package.json|functions/package-lock.json|pnpm-lock.yaml|\.pnpm/lock.yaml|workers/asset-worker/package.json|workers/narrator-worker/package.json|workers/spatial-worker/package.json|workers/studio-worker/package.json|docs/release-evidence/jobs-dependency-audit-receipt-20260711.json)$'
status="$(git status --porcelain --untracked-files=all)"
[ -n "$status" ] || fail "Dependency repair produced no changes"
while IFS= read -r line; do
  [[ "$line" =~ $allowed ]] || fail "Unexpected repository change: $line"
done <<< "$status"
git diff --check

log "Configuring commit identity and committing the exact audited set"
GH_LOGIN="$(gh api user --jq .login)"
GH_ID="$(gh api user --jq .id)"
[ -n "$GH_LOGIN" ] && [ -n "$GH_ID" ] || fail "Could not resolve GitHub identity"
git config user.name "${GIT_AUTHOR_NAME:-$GH_LOGIN}"
git config user.email "${GIT_AUTHOR_EMAIL:-${GH_ID}+${GH_LOGIN}@users.noreply.github.com}"
git add package.json functions/package.json functions/package-lock.json pnpm-lock.yaml .pnpm/lock.yaml \
  workers/asset-worker/package.json workers/narrator-worker/package.json \
  workers/spatial-worker/package.json workers/studio-worker/package.json \
  docs/release-evidence/jobs-dependency-audit-receipt-20260711.json
git commit -m "fix(jobs): eliminate dependency audit findings"
NEW_SHA="$(git rev-parse HEAD)"

log "Rechecking remote head immediately before push"
REMOTE_SHA="$(git ls-remote origin "refs/heads/$JOBS_BRANCH" | awk '{print $1}')"
[ "$REMOTE_SHA" = "$EXPECTED_JOBS_SHA" ] || fail "Remote Jobs head moved to $REMOTE_SHA; refusing push"
gh auth setup-git >/dev/null
git push origin "HEAD:$JOBS_BRANCH"

cat <<EOF

JOBS DEPENDENCY REPAIR: PASS
Previous head: $EXPECTED_JOBS_SHA
New head:      $NEW_SHA
npm full audit exit: $FULL_AUDIT_EXIT
npm production audit exit: $PROD_AUDIT_EXIT
pnpm audit exit: $PNPM_AUDIT_EXIT
Audit reports: $AUDIT_DIR
Receipt: docs/release-evidence/jobs-dependency-audit-receipt-20260711.json

The branch was pushed only after zero findings at every severity, frozen installs, source verification, typecheck, build and tests passed.
EOF

gh pr comment 75 --repo LifeLoggerAI/urai-jobs --body "Dependency repair completed at exact head \`$NEW_SHA\`: zero npm full, npm production and pnpm workspace findings; frozen installs, source verification, typecheck, build and tests passed. Receipt: \`URAI-WSC-20260711-JOBS-DEPENDENCY-AUDIT-013\`. No deployment or production mutation occurred." || true

if [ "$RUN_FULL_VERIFIER_AFTER_REPAIR" = "1" ]; then
  log "Starting full Workstream C verifier against repaired Jobs head $NEW_SHA"
  cd "$CONTROL_ROOT"
  JOBS_SHA="$NEW_SHA" bash scripts/run-workstream-c-cloud-shell.sh
fi
