#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EXPECTED_STAGING_PROJECT = 'urai-staging';
const EXPECTED_HOSTING_SITE = 'urai-staging';
const EXPECTED_STAGING_URL = 'https://urai-staging.web.app';
const DEPRECATED_STAGING_PROJECT = 'urai-staging-35414255';
const PRODUCTION_PROJECT = 'urai-4dc1d';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const requiredFiles = [
  '.env.example',
  '.firebaserc',
  '.github/workflows/ci.yml',
  '.github/workflows/staging-deploy.yml',
  '.github/workflows/urai-production-verify.yml',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules',
  'functions/package.json',
  'functions/src/index.ts',
  'public/index.html',
  'public/robots.txt',
  'scripts/repair-jobs-unused-error-reporting.sh',
  'scripts/run-with-java.sh',
  'scripts/urai-staging-lock.sh',
  'scripts/smoke-staging.sh',
  'scripts/staging-prebuilt-manifest.mjs',
  'scripts/urai-staging-bootstrap.mjs',
  'scripts/validate-launch-evidence.mjs',
  'scripts/workstream-c-current-candidates.env',
  'docs/WORKSTREAM_C_CURRENT_CANDIDATES.md',
  'docs/WORKSTREAM_C_MANUAL_VERIFICATION.md',
  'DEPLOYMENT.md',
  'ENVIRONMENT.md',
  'ENVIRONMENT_AUTHORITY.md',
  'RELEASE_NOTES.md',
  'SYSTEM_AUDIT.md',
  'TEST_REPORT.md',
  'URAI_STAGING_CANONICAL_APP.md',
  'URAI_STAGING_READINESS_MATRIX.md',
  'URAI_STAGING_LAUNCH_BLOCKERS.md',
  'URAI_STAGING_DEFINITION_OF_DONE.md',
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`Invalid JSON in ${filePath}: ${error.message}`);
    return null;
  }
}

function readText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8').replace(/\r\n?/g, '\n') : '';
}

function requireMarkers(filePath, text, markers) {
  for (const marker of markers) {
    if (!text.includes(marker)) failures.push(`${filePath} must include ${marker}`);
  }
}

function forbidMarkers(filePath, text, markers) {
  for (const marker of markers) {
    if (text.includes(marker)) failures.push(`${filePath} contains forbidden marker: ${marker}`);
  }
}

function rejectProjectIdentifiers(filePath, text) {
  if (text.includes(DEPRECATED_STAGING_PROJECT) || text.includes(PRODUCTION_PROJECT)) {
    failures.push(`${filePath} must not name deprecated staging or production project identifiers`);
  }
}

function readCandidateSha(text, variableName) {
  const match = text.match(new RegExp(`^${variableName}='([0-9a-f]{40})'$`, 'm'));
  if (!match || !SHA_PATTERN.test(match[1])) {
    failures.push(`scripts/workstream-c-current-candidates.env must define ${variableName} as one full lowercase SHA`);
    return '';
  }
  return match[1];
}

const firebaserc = readJson('.firebaserc');
if (firebaserc) {
  const projects = firebaserc.projects ?? {};
  const aliases = Object.keys(projects).sort();
  if (projects.staging !== EXPECTED_STAGING_PROJECT) failures.push(`.firebaserc projects.staging must be ${EXPECTED_STAGING_PROJECT}`);
  if (projects.default !== EXPECTED_STAGING_PROJECT) failures.push(`.firebaserc projects.default must be ${EXPECTED_STAGING_PROJECT}`);
  if (aliases.join(',') !== 'default,staging') failures.push('.firebaserc must define only default and staging project aliases');
  if (Object.prototype.hasOwnProperty.call(projects, 'production')) failures.push('.firebaserc must not define a production alias');
}

const candidateManifestText = readText('scripts/workstream-c-current-candidates.env');
const candidateShas = {
  Admin: readCandidateSha(candidateManifestText, 'ADMIN_SHA'),
  Privacy: readCandidateSha(candidateManifestText, 'PRIVACY_SHA'),
  Jobs: readCandidateSha(candidateManifestText, 'JOBS_SHA'),
};
const candidateMirrorText = readText('docs/WORKSTREAM_C_CURRENT_CANDIDATES.md');
for (const [label, sha] of Object.entries(candidateShas)) {
  if (sha && !candidateMirrorText.includes(`- ${label}: \`${sha}\``)) {
    failures.push(`docs/WORKSTREAM_C_CURRENT_CANDIDATES.md must mirror ${label} SHA ${sha}`);
  }
}
if (!candidateMirrorText.includes('deploy-readiness gate requires this human mirror to match those exact full SHAs')) {
  failures.push('docs/WORKSTREAM_C_CURRENT_CANDIDATES.md must declare executable machine/human mirror enforcement');
}

const environmentText = readText('ENVIRONMENT.md');
requireMarkers('ENVIRONMENT.md', environmentText, [
  'must keep only the nonproduction aliases',
  'A `production` alias is prohibited',
  'The only deploy authority is `.github/workflows/staging-deploy.yml`',
  'Local environments must not run the staging deploy command',
  '`FIREBASE_SERVICE_ACCOUNT_URAI_STAGING`',
  '`RUNNER_TEMP`',
]);
rejectProjectIdentifiers('ENVIRONMENT.md', environmentText);

const deploymentText = readText('DEPLOYMENT.md');
requireMarkers('DEPLOYMENT.md', deploymentText, [
  'Staging deployment is permitted only through `.github/workflows/staging-deploy.yml`',
  'Direct local deployment is intentionally blocked',
  '`expected_main_sha`',
  '`run_live_deploy`: `false`',
  '`run_live_deploy`: `true`',
  'environment-gated credentialed deploy job',
  'it never creates infrastructure',
]);
rejectProjectIdentifiers('DEPLOYMENT.md', deploymentText);

const authorityText = readText('ENVIRONMENT_AUTHORITY.md');
requireMarkers('ENVIRONMENT_AUTHORITY.md', authorityText, [
  'owns only the URAI staging',
  'Production alias: intentionally absent',
  'must not deploy to, alias, or imply ownership of the production project',
  'SOURCE AUTHORITY REPAIRED — NOT VERIFIED OR DEPLOYED',
  'must not create Hosting sites or other infrastructure',
  'Billing good standing',
]);
rejectProjectIdentifiers('ENVIRONMENT_AUTHORITY.md', authorityText);

const canonicalAppText = readText('URAI_STAGING_CANONICAL_APP.md');
requireMarkers('URAI_STAGING_CANONICAL_APP.md', canonicalAppText, [
  `- Staging project: \`${EXPECTED_STAGING_PROJECT}\``,
  `- Staging URL: \`${EXPECTED_STAGING_URL}\``,
  'must not define, document as a selectable alias, or deploy to a production Firebase project',
]);
rejectProjectIdentifiers('URAI_STAGING_CANONICAL_APP.md', canonicalAppText);

const launchBlockersText = readText('URAI_STAGING_LAUNCH_BLOCKERS.md');
requireMarkers('URAI_STAGING_LAUNCH_BLOCKERS.md', launchBlockersText, [
  'Protected deployment authority',
  'Infrastructure mutation boundary',
  'Deploy only through `Staging Deploy Lock` from exact `main`',
  'must remain unmerged',
]);
rejectProjectIdentifiers('URAI_STAGING_LAUNCH_BLOCKERS.md', launchBlockersText);

const definitionOfDoneText = readText('URAI_STAGING_DEFINITION_OF_DONE.md');
requireMarkers('URAI_STAGING_DEFINITION_OF_DONE.md', definitionOfDoneText, [
  '`.firebaserc` maps `default` and `staging` to `urai-staging` and defines no production alias',
  '`Staging Deploy Lock` checks-only mode succeeds from `main`',
  'GitHub `staging` environment',
  '`--project urai-staging`',
  '`https://urai-staging.web.app`',
  'not complete or live-verified',
]);
rejectProjectIdentifiers('URAI_STAGING_DEFINITION_OF_DONE.md', definitionOfDoneText);

const envExampleText = readText('.env.example');
requireMarkers('.env.example', envExampleText, [
  `URAI_STAGING_PROJECT_ID=${EXPECTED_STAGING_PROJECT}`,
  `URAI_STAGING_URL=${EXPECTED_STAGING_URL}`,
  'URAI_PRODUCTION_DEPLOY_APPROVED=0',
  'URAI_STAGING_PROTECTED_DEPLOY=0',
  `GOOGLE_CLOUD_PROJECT=${EXPECTED_STAGING_PROJECT}`,
  `GCLOUD_PROJECT=${EXPECTED_STAGING_PROJECT}`,
]);
if (envExampleText.includes('URAI_PRODUCTION_PROJECT_ID=') || envExampleText.includes(PRODUCTION_PROJECT) || envExampleText.includes(DEPRECATED_STAGING_PROJECT)) {
  failures.push('.env.example must not expose production or deprecated project selectors');
}

const ciWorkflowText = readText('.github/workflows/ci.yml');
const ciRetentionMarkers = ciWorkflowText.match(/retention-days:\s*90/g) ?? [];
if (ciRetentionMarkers.length !== 2) failures.push(`.github/workflows/ci.yml must retain both public-repo artifacts for 90 days; found ${ciRetentionMarkers.length}`);
if (/retention-days:\s*365/.test(ciWorkflowText)) failures.push('.github/workflows/ci.yml must not request unsupported 365-day public-repo retention');

const repairWrapperText = readText('scripts/repair-jobs-unused-error-reporting.sh');
requireMarkers('scripts/repair-jobs-unused-error-reporting.sh', repairWrapperText, [
  'remote publication is not available from this local verification command',
  'JOBS DEPENDENCY REPAIR: LOCAL VERIFICATION PASS',
  "! grep -F 'gh auth' \"$PATCHED\"",
  "! grep -F 'git push' \"$PATCHED\"",
  'JOBS_REPAIR_PUBLISH=0 bash "$PATCHED"',
]);
if (repairWrapperText.includes('PUBLISH_VERIFIED_JOBS_REPAIR')) failures.push('The official local Jobs repair wrapper must not expose a publication confirmation path');

const manualVerificationText = readText('docs/WORKSTREAM_C_MANUAL_VERIFICATION.md');
requireMarkers('docs/WORKSTREAM_C_MANUAL_VERIFICATION.md', manualVerificationText, [
  'official repair command is local-verification-only',
  'does not require GitHub CLI or authentication',
  '`JOBS_REPAIR_PUBLISH` must remain `0`',
  'Remote publication is intentionally unavailable from this command',
]);

const deployWorkflowText = readText('.github/workflows/staging-deploy.yml');
requireMarkers('.github/workflows/staging-deploy.yml', deployWorkflowText, [
  'name: Staging Deploy Lock',
  'workflow_dispatch:',
  'expected_main_sha:',
  'rollback_sha:',
  "test '${{ github.ref }}' = 'refs/heads/main'",
  "test '${{ github.sha }}' = \"$TARGET_SHA\"",
  'git ls-remote --exit-code origin refs/heads/main',
  'git merge-base --is-ancestor',
  'persist-credentials: false',
  'Credential-free exact-main staging preflight',
  'npm --prefix functions ci --ignore-scripts',
  'node scripts/urai-staging-bootstrap.mjs',
  'node scripts/validate-launch-evidence.mjs',
  'staging-prebuilt-manifest.mjs --write',
  'staging-prebuilt-manifest.mjs --verify-external',
  'staging-prebuilt-manifest.mjs --materialize',
  'environment: staging',
  'GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-staging-service-account.json',
  'FIREBASE_SERVICE_ACCOUNT_URAI_STAGING: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_URAI_STAGING }}',
  "URAI_STAGING_PROTECTED_DEPLOY: '1'",
  "ALLOW_CREATE_STAGING_HOSTING_SITE: '0'",
  "FIREBASE_CLI_VERSION: '15.23.0'",
  'Destroy staging credentials before evidence handoff',
  'Public staging verification without cloud identity',
  'staging-mutation-receipt.json',
  'retention-days: 90',
]);
if (/retention-days:\s*365/.test(deployWorkflowText)) failures.push('.github/workflows/staging-deploy.yml must not request unsupported 365-day public-repo retention');

const allowedDeployActions = new Set([
  'actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/setup-java@c1e323688fd81a25caa38c78aa6df2d33d3e20d9',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
]);
const deployActionRefs = [...deployWorkflowText.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1]);
for (const actionRef of deployActionRefs) {
  const ref = actionRef.slice(actionRef.lastIndexOf('@') + 1);
  if (!SHA_PATTERN.test(ref)) failures.push(`Staging deploy external action must use a full immutable SHA: ${actionRef}`);
  if (!allowedDeployActions.has(actionRef)) failures.push(`Unexpected external action in staging deploy workflow: ${actionRef}`);
}
for (const expected of allowedDeployActions) {
  if (!deployActionRefs.includes(expected)) failures.push(`Staging deploy workflow must use pinned action ${expected}`);
}
forbidMarkers('.github/workflows/staging-deploy.yml', deployWorkflowText, [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/setup-java@v4',
  'actions/upload-artifact@v4',
  'actions/download-artifact@v4',
  'pull_request_target:',
  'contents: write',
  'id-token: write',
  'npm install -g firebase-tools',
  '${{ github.workspace }}/.firebase-service-account.json',
  'firebase hosting:sites:create',
]);

const productionVerifyText = readText('.github/workflows/urai-production-verify.yml');
requireMarkers('.github/workflows/urai-production-verify.yml', productionVerifyText, [
  'ref: ${{ env.TARGET_SHA }}',
  'fetch-depth: 0',
  'persist-credentials: false',
  'Setup Java 21 for Firebase emulators',
  'node scripts/urai-staging-bootstrap.mjs',
  'node scripts/validate-launch-evidence.mjs',
  'node scripts/urai-production-verify.mjs',
  'retention-days: 90',
]);
forbidMarkers('.github/workflows/urai-production-verify.yml', productionVerifyText, [
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'actions/setup-java@v4',
  'actions/upload-artifact@v4',
  'retention-days: 365',
]);

const firebaseJson = readJson('firebase.json');
if (firebaseJson) {
  if (firebaseJson.hosting?.site !== EXPECTED_HOSTING_SITE) failures.push(`firebase.json hosting.site must be ${EXPECTED_HOSTING_SITE}`);
  if (!firebaseJson.hosting?.public) failures.push('firebase.json must define hosting.public');
  if (!firebaseJson.functions?.source) failures.push('firebase.json must define functions.source');
  if (firebaseJson.firestore?.rules !== 'firestore.rules') failures.push('firebase.json must deploy firestore.rules');
  if (firebaseJson.firestore?.indexes !== 'firestore.indexes.json') failures.push('firebase.json must deploy firestore.indexes.json');
  if (firebaseJson.storage?.rules !== 'storage.rules') failures.push('firebase.json must deploy storage.rules');
}

const rootPackage = readJson('package.json');
if (rootPackage) {
  const deployScript = rootPackage.scripts?.['deploy:staging'] ?? '';
  const lockScript = rootPackage.scripts?.['lock:staging'] ?? '';
  const checkDeployScript = rootPackage.scripts?.['check:deploy'] ?? '';
  const rulesScript = rootPackage.scripts?.['test:rules'] ?? '';
  const e2eScript = rootPackage.scripts?.['test:e2e'] ?? '';
  const emulatorsScript = rootPackage.scripts?.emulators ?? '';
  if (!deployScript.includes('lock:staging')) failures.push('package.json deploy:staging must delegate to lock:staging');
  if (!lockScript.includes('scripts/urai-staging-lock.sh')) failures.push('package.json lock:staging must run scripts/urai-staging-lock.sh');
  if (!checkDeployScript.includes('scripts/check-deploy-readiness.mjs')) failures.push('package.json check:deploy must run scripts/check-deploy-readiness.mjs');
  for (const [name, script] of [['test:rules', rulesScript], ['test:e2e', e2eScript], ['emulators', emulatorsScript]]) {
    if (!script.includes('scripts/run-with-java.sh')) failures.push(`package.json ${name} must use scripts/run-with-java.sh`);
  }
}

const functionsIndexText = readText('functions/src/index.ts');
if (!functionsIndexText.includes(`const STAGING_PROJECT_ID = '${EXPECTED_STAGING_PROJECT}'`)) failures.push(`functions/src/index.ts must report staging project ${EXPECTED_STAGING_PROJECT}`);
if (!functionsIndexText.includes(`const STAGING_HOSTING_URL = '${EXPECTED_STAGING_URL}'`)) failures.push(`functions/src/index.ts must report staging URL ${EXPECTED_STAGING_URL}`);
if (functionsIndexText.includes(DEPRECATED_STAGING_PROJECT)) failures.push(`functions/src/index.ts must not reference deprecated project ${DEPRECATED_STAGING_PROJECT}`);

const publicIndexText = readText('public/index.html');
for (const requiredCopy of ['URAI Staging', 'Staging environment', 'not the production app', 'synthetic staging data only', 'companion', 'ground', '/api/healthz', '/api/buildinfo']) {
  if (!publicIndexText.includes(requiredCopy)) failures.push(`public/index.html must include ${requiredCopy}`);
}

const robotsText = readText('public/robots.txt');
if (!robotsText.includes('Disallow: /')) failures.push('public/robots.txt must disallow indexing for staging');

const javaRunnerText = readText('scripts/run-with-java.sh');
if (!javaRunnerText.includes('nix-shell') || !javaRunnerText.includes('command -v java')) failures.push('scripts/run-with-java.sh must support both nix-shell and existing Java runtimes');

const lockScriptText = readText('scripts/urai-staging-lock.sh');
requireMarkers('scripts/urai-staging-lock.sh', lockScriptText, [
  'URAI_STAGING_PROTECTED_DEPLOY',
  'GITHUB_ACTIONS',
  'refs/heads/main',
  'git ls-remote --exit-code origin refs/heads/main',
  'URAI_RELEASE_CANDIDATE_SHA is required',
  'URAI_STAGING_ROLLBACK_SHA is required',
  'git merge-base --is-ancestor',
  'URAI_STAGING_PREFLIGHT_VERIFIED',
  'URAI_STAGING_AUTHORITY_SCOPE',
  'URAI_STAGING_CONSUMER_ASSIGNMENTS_JSON',
  'RUNNER_TEMP',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'staging-prebuilt-manifest.mjs --verify-materialized',
  'firebase hosting:sites:list',
  `hosting:"$EXPECTED_HOSTING_SITE"`,
  '--non-interactive',
  "schemaVersion: 'urai-staging-mutation-2'",
  'hostingSitePreExisted: true',
  'productionDeploymentPerformed: false',
  'secretValuesIncluded: false',
  'publicVerificationCompleted: false',
]);
forbidMarkers('scripts/urai-staging-lock.sh', lockScriptText, [
  'firebase hosting:sites:create',
  'firebase use ',
  'nix-shell not found; skipping',
  'URAI_PRODUCTION_PROJECT_ID',
  PRODUCTION_PROJECT,
]);

const prebuiltText = readText('scripts/staging-prebuilt-manifest.mjs');
requireMarkers('scripts/staging-prebuilt-manifest.mjs', prebuiltText, [
  "schemaVersion: 'urai-staging-prebuilt-2'",
  'sourceTreeSha',
  'sourceStateVerifiedClean: true',
  "authorityScope: 'urai-staging-repository-only'",
  'crossSystemMutationAuthorized: false',
  '--verify-external',
  '--materialize',
]);

const smokeScriptText = readText('scripts/smoke-staging.sh');
if (!smokeScriptText.includes(EXPECTED_STAGING_URL)) failures.push(`scripts/smoke-staging.sh must target ${EXPECTED_STAGING_URL} by default`);
if (!smokeScriptText.includes('/api/companion')) failures.push('scripts/smoke-staging.sh must check /api/companion');
if (!smokeScriptText.includes('/api/waitlist')) failures.push('scripts/smoke-staging.sh must check /api/waitlist');

try {
  const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  console.log(`Readiness check running at commit ${sha}`);
} catch {
  console.log('Readiness check running outside a full git checkout; skipping commit echo.');
}

if (failures.length > 0) {
  console.error('\nURAI staging deploy readiness failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`URAI staging deploy readiness passed for ${EXPECTED_STAGING_PROJECT} hosting site ${EXPECTED_HOSTING_SITE}.`);
