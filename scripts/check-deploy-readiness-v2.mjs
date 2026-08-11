#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const expectedProject = 'urai-staging';
const expectedSite = 'urai-staging';
const expectedUrl = 'https://urai-staging.web.app';
const failures = [];

const requiredFiles = [
  '.firebaserc',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules',
  'functions/package.json',
  'functions/src/index.ts',
  'functions/src/lib/stagingBoundaries.ts',
  'functions/test/stagingBoundaries.test.ts',
  'scripts/smoke-staging.sh',
  'scripts/urai-staging-lock.sh',
  'scripts/staging-prebuilt-manifest.mjs',
  '.github/workflows/staging-deploy.yml',
  '.github/workflows/urai-production-verify.yml',
  'ENVIRONMENT_AUTHORITY.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

function text(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n?/g, '\n') : '';
}

function json(path) {
  try {
    return JSON.parse(text(path));
  } catch (error) {
    failures.push(`Invalid JSON in ${path}: ${error.message}`);
    return null;
  }
}

function requirePhrases(path, phrases) {
  const content = text(path);
  for (const phrase of phrases) {
    if (!content.includes(phrase)) failures.push(`${path} missing required contract: ${phrase}`);
  }
}

function rejectPhrases(path, phrases) {
  const content = text(path);
  for (const phrase of phrases) {
    if (content.includes(phrase)) failures.push(`${path} contains forbidden contract: ${phrase}`);
  }
}

function requireOrder(path, markers, description) {
  const content = text(path);
  const indexes = markers.map((marker) => content.indexOf(marker));
  if (indexes.some((index) => index < 0) || indexes.some((index, position) => position > 0 && index <= indexes[position - 1])) {
    failures.push(`${path} does not preserve ${description}: ${markers.join(' -> ')}`);
  }
}

const firebaserc = json('.firebaserc');
if (firebaserc) {
  const projects = firebaserc.projects ?? {};
  if (projects.default !== expectedProject) failures.push(`.firebaserc default must be ${expectedProject}`);
  if (projects.staging !== expectedProject) failures.push(`.firebaserc staging must be ${expectedProject}`);
  const unexpected = Object.keys(projects).filter((alias) => !['default', 'staging'].includes(alias));
  if (unexpected.length) failures.push(`Unexpected Firebase aliases: ${unexpected.join(', ')}`);
  if ('production' in projects) failures.push('Staging repository must not define a production alias');
}

const firebase = json('firebase.json');
if (firebase) {
  if (firebase.hosting?.site !== expectedSite) failures.push(`Hosting site must be ${expectedSite}`);
  if (!firebase.hosting?.public) failures.push('firebase.json must define hosting.public');
  if (!firebase.functions?.source) failures.push('firebase.json must define functions.source');
  if (firebase.firestore?.rules !== 'firestore.rules') failures.push('Firestore rules path is not canonical');
  if (firebase.firestore?.indexes !== 'firestore.indexes.json') failures.push('Firestore indexes path is not canonical');
  if (firebase.storage?.rules !== 'storage.rules') failures.push('Storage rules path is not canonical');
  const rewrites = Array.isArray(firebase.hosting?.rewrites) ? firebase.hosting.rewrites : [];
  const buildInfoRewrite = rewrites.find((rewrite) => rewrite?.source === '/api/buildinfo');
  if (buildInfoRewrite?.function !== 'buildinfo') failures.push('/api/buildinfo must route to lowercase buildinfo before the SPA fallback');
  if (!rewrites.some((rewrite) => rewrite?.source === '**' && rewrite?.destination === '/index.html')) {
    failures.push('Hosting must retain the SPA fallback after API rewrites');
  }
}

const rootPackage = json('package.json');
if (rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  if (!scripts['check:deploy']?.includes('check-deploy-readiness-v2.mjs')) failures.push('check:deploy must use the semantic readiness gate');
  if (!scripts['deploy:staging']?.includes('lock:staging')) failures.push('deploy:staging must delegate to lock:staging');
  if (!scripts['lock:staging']?.includes('urai-staging-lock.sh')) failures.push('lock:staging must execute the canonical lock');
  for (const name of ['test:rules', 'test:e2e', 'emulators']) {
    if (!scripts[name]?.includes('run-with-java.sh')) failures.push(`${name} must use the Java compatibility wrapper`);
  }
}

const functionsPackage = json('functions/package.json');
if (functionsPackage && !functionsPackage.scripts?.['test:unit']?.includes('stagingBoundaries.test.ts')) {
  failures.push('Functions unit suite must include stagingBoundaries.test.ts');
}

requirePhrases('functions/src/lib/stagingBoundaries.ts', [
  `STAGING_PROJECT_ID = '${expectedProject}'`,
  `STAGING_HOSTING_URL = '${expectedUrl}'`,
  'isSyntheticStagingEmail',
  'example.com',
  'stagingWaitlistDocumentId',
  "createHash('sha256')",
  'URAI_RELEASE_CANDIDATE_SHA',
  'URAI_DEPLOYED_AT',
  'URAI_DEPLOYMENT_WORKFLOW_RUN_ID',
  'K_REVISION',
]);

requirePhrases('functions/src/index.ts', [
  "from './lib/stagingBoundaries'",
  'export const buildinfo',
  '...stagingRuntimeBuildInfo()',
  'persisted: false',
  'isSyntheticStagingEmail(body.email)',
  'synthetic_email_required',
  'stagingWaitlistDocumentId(email)',
  'synthetic: true',
]);
const functionsIndex = text('functions/src/index.ts');
if (functionsIndex.includes("db.collection('staging_events').add") && functionsIndex.includes("type: 'companion_smoke'")) {
  failures.push('Public companion endpoint must not persist smoke events');
}
if (functionsIndex.includes('doc(email)')) failures.push('Waitlist document IDs must not contain raw email addresses');

requirePhrases('scripts/staging-prebuilt-manifest.mjs', [
  "schemaVersion: 'urai-staging-prebuilt-2'",
  'assertReviewedSourceUnchanged',
  "['diff', '--exit-code', '--', '.']",
  "['diff', '--cached', '--exit-code', '--', '.']",
  "['ls-files', '--others', '--exclude-standard', '-z']",
  'allowedGeneratedPrefixes',
  "'artifacts/launch/'",
  "'artifacts/prebuilt/'",
  "'functions/lib/'",
  "gitText('rev-parse', 'HEAD^{tree}')",
  'sourceTreeSha',
  'sourceStateVerifiedClean: true',
  '--verify-external requires URAI_STAGING_PREBUILT_ROOT outside the repository',
  '--materialize requires URAI_STAGING_PREBUILT_ROOT outside the repository',
  'file set, size, or hash',
  'Refusing to materialize symlink',
]);
const prebuiltSource = text('scripts/staging-prebuilt-manifest.mjs');
const generatedBlock = prebuiltSource.match(/const allowedGeneratedPrefixes = \[([\s\S]*?)\];/);
if (!generatedBlock) failures.push('Staging prebuilt allowed-generated-prefix block is missing');
else if (generatedBlock[1].includes("'public/'") || generatedBlock[1].includes('"public/"')) {
  failures.push('Tracked public Hosting input must not accept arbitrary untracked files');
}

requirePhrases('scripts/smoke-staging.sh', [
  'Exact staging mutation receipt is required',
  'URAI_RELEASE_CANDIDATE_SHA is required for exact runtime smoke',
  '/api/buildinfo',
  'releaseCandidateSha must equal exact candidate',
  'deployedAt must equal current mutation receipt',
  'deploymentWorkflowRunId must equal current mutation workflow',
  'runtimeProjectId must equal',
  'Default release smoke is intentionally non-mutating',
  '/api/companion',
  '/api/waitlist',
]);
rejectPhrases('scripts/smoke-staging.sh', ['launch-smoke@example.com', 'Staging smoke check']);

requirePhrases('scripts/urai-staging-lock.sh', [
  'URAI_STAGING_PROTECTED_DEPLOY',
  'GITHUB_ACTIONS',
  'refs/heads/main',
  'git ls-remote --exit-code origin refs/heads/main',
  'git merge-base --is-ancestor',
  'URAI_STAGING_PREFLIGHT_VERIFIED',
  'URAI_STAGING_AUTHORITY_SCOPE',
  'consumer-system mutations',
  'GITHUB_WORKSPACE',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_GHA_CREDS_PATH',
  'gha-creds-*.json',
  'git check-ignore',
  'GOOGLE_CLOUD_PROJECT',
  'WIF project identity mismatch',
  'firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" --json',
  'exact provider identity',
  'ALLOW_CREATE_STAGING_HOSTING_SITE',
  'scripts/staging-prebuilt-manifest.mjs --verify-materialized',
  'URAI_RELEASE_CANDIDATE_SHA=$RELEASE_SHA',
  'URAI_DEPLOYMENT_WORKFLOW_RUN_ID=$GITHUB_RUN_ID',
  "schemaVersion: 'urai-staging-mutation-2'",
  'deploymentCommandCompleted',
  'hostingSitePreExisted: true',
  'productionDeploymentPerformed: false',
  'secretValuesIncluded: false',
  'publicVerificationCompleted: false',
  'Credential class: WIF/ephemeral ADC',
  'Staging mutation completed for exact main',
  'public verification remains required',
]);
rejectPhrases('scripts/urai-staging-lock.sh', [
  'firebase hosting:sites:create',
  'firebase use "$EXPECTED_PROJECT_ID"',
  'publicVerificationCompleted: true',
  'FIREBASE_SERVICE_ACCOUNT_URAI_STAGING',
  'credentials_json',
  'private_key',
]);

requirePhrases('.github/workflows/staging-deploy.yml', [
  'expected_main_sha:',
  'rollback_sha:',
  'run_live_deploy:',
  'environment: staging',
  'id-token: write',
  'ref: ${{ env.TARGET_SHA }}',
  'persist-credentials: false',
  'git ls-remote --exit-code origin refs/heads/main',
  'git merge-base --is-ancestor',
  'Run credential-free protected staging verification',
  'Seal source-bound staging prebuilt artifact',
  'Download source-bound prebuilt artifact outside repository',
  'Verify external artifact before credentials exist',
  'Install exact Firebase CLI outside repository',
  'Materialize verified Functions output before credentials exist',
  'Require exact staging credential',
  'GCP_WIF_PROVIDER',
  'GCP_STAGING_DEPLOY_SERVICE_ACCOUNT',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'create_credentials_file: true',
  'export_environment_variables: true',
  'GOOGLE_GHA_CREDS_PATH',
  'gha-creds-*.json',
  'WIF credential project mismatch',
  "URAI_PRODUCTION_DEPLOY_APPROVED: '0'",
  "ALLOW_CREATE_STAGING_HOSTING_SITE: '0'",
  'Destroy staging credentials before evidence handoff',
  'Upload protected staging mutation evidence',
  'Public staging verification without cloud identity',
  'Bind public verification to mutation receipt',
  'Run non-mutating live smoke',
  'publicVerificationCompleted: verified',
]);
requireOrder('.github/workflows/staging-deploy.yml', [
  'Run credential-free protected staging verification',
  'Seal source-bound staging prebuilt artifact',
  'Download source-bound prebuilt artifact outside repository',
  'Verify external artifact before credentials exist',
  'Install exact Firebase CLI outside repository',
  'Materialize verified Functions output before credentials exist',
  'Require exact staging credential',
  'Deploy verified artifact to staging only',
  'Destroy staging credentials before evidence handoff',
  'Upload protected staging mutation evidence',
  'Public staging verification without cloud identity',
], 'credential-free preflight, protected mutation, cleanup, and public verification order');

const deployWorkflow = text('.github/workflows/staging-deploy.yml');
const credentialStep = deployWorkflow.indexOf('Require exact staging credential');
if (credentialStep < 0) failures.push('Staging credential boundary is missing');
else if (deployWorkflow.slice(0, credentialStep).includes('secrets.')) {
  failures.push('Protected secrets must not be exposed before external artifact verification and materialization');
}
for (const forbidden of [
  'FIREBASE_SERVICE_ACCOUNT_URAI_STAGING',
  'credentials_json:',
  'GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-staging-service-account.json',
  'printf \'%s\' "$FIREBASE_SERVICE_ACCOUNT_URAI_STAGING"',
]) {
  if (deployWorkflow.includes(forbidden)) failures.push(`Staging deploy workflow contains retired long-lived credential path: ${forbidden}`);
}
const publicSection = deployWorkflow.slice(deployWorkflow.indexOf('public-verify:'));
if (publicSection.includes('secrets.') || publicSection.includes('environment: staging') || publicSection.includes('firebase deploy')) {
  failures.push('Public verification must not receive secrets, protected environment authority, or mutation commands');
}

requirePhrases('.github/workflows/urai-production-verify.yml', [
  'ref: ${{ env.TARGET_SHA }}',
  'fetch-depth: 0',
  'persist-credentials: false',
  'Setup Java 21 for Firebase emulators',
  'node scripts/urai-staging-bootstrap.mjs',
  'node scripts/validate-launch-evidence.mjs',
  'node scripts/urai-production-verify.mjs',
]);

requirePhrases('ENVIRONMENT_AUTHORITY.md', [
  'owns only the URAI staging',
  'Production alias: intentionally absent',
  'must not deploy to, alias, or imply ownership of the production project',
  'SOURCE AUTHORITY REPAIRED — NOT VERIFIED OR DEPLOYED',
  'must not create Hosting sites or other infrastructure',
  'Billing good standing',
]);

if (failures.length) {
  console.error('URAI staging semantic deploy readiness failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`URAI staging semantic deploy readiness passed for ${expectedProject} / ${expectedSite}.`);
