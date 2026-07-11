#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EXPECTED_STAGING_PROJECT = 'urai-staging';
const EXPECTED_HOSTING_SITE = 'urai-staging';
const EXPECTED_STAGING_URL = 'https://urai-staging.web.app';
const DEPRECATED_STAGING_PROJECT = 'urai-staging-35414255';
const requiredFiles = [
  '.firebaserc',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules',
  'functions/package.json',
  'functions/src/index.ts',
  'public/index.html',
  'public/robots.txt',
  'scripts/run-with-java.sh',
  'scripts/urai-staging-lock.sh',
  'scripts/smoke-staging.sh',
  '.github/workflows/staging-deploy.yml',
  '.github/workflows/urai-production-verify.yml',
  'DEPLOYMENT.md',
  'ENVIRONMENT.md',
  'ENVIRONMENT_AUTHORITY.md',
  'RELEASE_NOTES.md',
  'SYSTEM_AUDIT.md',
  'TEST_REPORT.md',
  'URAI_STAGING_CANONICAL_APP.md',
  'URAI_STAGING_READINESS_MATRIX.md',
  'URAI_STAGING_LAUNCH_BLOCKERS.md',
  'URAI_STAGING_DEFINITION_OF_DONE.md'
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
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

const firebaserc = readJson('.firebaserc');
if (firebaserc) {
  if (firebaserc.projects?.staging !== EXPECTED_STAGING_PROJECT) failures.push(`.firebaserc projects.staging must be ${EXPECTED_STAGING_PROJECT}`);
  if (firebaserc.projects?.default !== EXPECTED_STAGING_PROJECT) failures.push(`.firebaserc projects.default must be ${EXPECTED_STAGING_PROJECT}`);
  if (Object.prototype.hasOwnProperty.call(firebaserc.projects ?? {}, 'production')) failures.push('.firebaserc must not define any production alias in the staging repository');
  const unexpectedAliases = Object.keys(firebaserc.projects ?? {}).filter((alias) => !['default', 'staging'].includes(alias));
  if (unexpectedAliases.length > 0) failures.push(`.firebaserc contains unexpected aliases: ${unexpectedAliases.join(', ')}`);
}

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
    if (!script.includes('scripts/run-with-java.sh')) failures.push(`package.json ${name} must use scripts/run-with-java.sh for CI/Firebase Studio compatibility`);
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
for (const requiredLockPhrase of [
  'URAI_RELEASE_CANDIDATE_SHA is required',
  'URAI_STAGING_ROLLBACK_SHA is required',
  'git merge-base --is-ancestor',
  'git status --porcelain --untracked-files=all',
  'ALLOW_CREATE_STAGING_HOSTING_SITE',
  'Refusing to create billable or externally visible infrastructure',
  'npm run test:e2e',
  `hosting:"$EXPECTED_HOSTING_SITE"`,
  '--non-interactive'
]) {
  if (!lockScriptText.includes(requiredLockPhrase)) failures.push(`staging lock must include ${requiredLockPhrase}`);
}
if (lockScriptText.includes('URAI_PRODUCTION_PROJECT_ID')) failures.push('scripts/urai-staging-lock.sh must not reference a production project variable');
if (lockScriptText.includes('firebase hosting:sites:create')) failures.push('canonical staging lock must not create a Hosting site');
if (lockScriptText.includes('skipping emulator-backed')) failures.push('canonical staging lock must not skip emulator-backed tests');

const stagingWorkflowText = readText('.github/workflows/staging-deploy.yml');
for (const requiredWorkflowPhrase of [
  'expected_sha:',
  'rollback_sha:',
  'environment: staging',
  'ref: ${{ inputs.expected_sha }}',
  'persist-credentials: false',
  'git merge-base --is-ancestor',
  'test -z "$(git status --porcelain --untracked-files=all)"',
  'URAI_PRODUCTION_DEPLOY_APPROVED: "0"',
  'ALLOW_CREATE_STAGING_HOSTING_SITE: "0"',
  'python -m json.tool "$GOOGLE_APPLICATION_CREDENTIALS"',
  'Credential project mismatch',
  'URAI_STAGING_ROLLBACK_SHA',
  'Remove staging credential file',
  'rm -f "$GOOGLE_APPLICATION_CREDENTIALS"'
]) {
  if (!stagingWorkflowText.includes(requiredWorkflowPhrase)) failures.push(`staging deploy workflow must include ${requiredWorkflowPhrase}`);
}

const productionVerifyText = readText('.github/workflows/urai-production-verify.yml');
for (const requiredVerifyPhrase of [
  'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
  'persist-credentials: false',
  'git status --porcelain --untracked-files=all',
  'Setup Java for Firebase emulators',
  'node scripts/urai-staging-bootstrap.mjs',
  'node scripts/validate-launch-evidence.mjs'
]) {
  if (!productionVerifyText.includes(requiredVerifyPhrase)) failures.push(`production verification workflow must include ${requiredVerifyPhrase}`);
}

const authorityText = readText('ENVIRONMENT_AUTHORITY.md');
for (const requiredAuthorityPhrase of [
  'owns only the URAI staging',
  'Production alias: intentionally absent',
  'must not deploy to, alias, or imply ownership of the production project',
  'SOURCE AUTHORITY REPAIRED — NOT VERIFIED OR DEPLOYED',
  'must not create Hosting sites or other infrastructure',
  'Billing good standing'
]) {
  if (!authorityText.includes(requiredAuthorityPhrase)) failures.push(`ENVIRONMENT_AUTHORITY.md must include ${requiredAuthorityPhrase}`);
}

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
