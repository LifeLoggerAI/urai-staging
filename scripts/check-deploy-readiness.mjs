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
  'scripts/workstream-c-current-candidates.env',
  'docs/WORKSTREAM_C_CURRENT_CANDIDATES.md',
  'DEPLOYMENT.md',
  'ENVIRONMENT.md',
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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`Invalid JSON in ${path}: ${error.message}`);
    return null;
  }
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function rejectProjectIdentifiers(path, text) {
  if (text.includes(DEPRECATED_STAGING_PROJECT) || text.includes(PRODUCTION_PROJECT)) {
    failures.push(`${path} must not name deprecated staging or production project identifiers`);
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
  Jobs: readCandidateSha(candidateManifestText, 'JOBS_SHA')
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
if (!environmentText.includes('must keep only the nonproduction aliases')) failures.push('ENVIRONMENT.md must require only nonproduction Firebase aliases');
if (!environmentText.includes('A `production` alias is prohibited')) failures.push('ENVIRONMENT.md must explicitly prohibit the production alias');
rejectProjectIdentifiers('ENVIRONMENT.md', environmentText);

const canonicalAppText = readText('URAI_STAGING_CANONICAL_APP.md');
if (!canonicalAppText.includes(`- Staging project: \`${EXPECTED_STAGING_PROJECT}\``)) failures.push(`URAI_STAGING_CANONICAL_APP.md must bind ${EXPECTED_STAGING_PROJECT}`);
if (!canonicalAppText.includes(`- Staging URL: \`${EXPECTED_STAGING_URL}\``)) failures.push(`URAI_STAGING_CANONICAL_APP.md must bind ${EXPECTED_STAGING_URL}`);
if (!canonicalAppText.includes('must not define, document as a selectable alias, or deploy to a production Firebase project')) {
  failures.push('URAI_STAGING_CANONICAL_APP.md must prohibit production project selection and deployment');
}
rejectProjectIdentifiers('URAI_STAGING_CANONICAL_APP.md', canonicalAppText);

const launchBlockersText = readText('URAI_STAGING_LAUNCH_BLOCKERS.md');
for (const marker of [
  '`.firebaserc` maps default and staging to `urai-staging`',
  'the lock script targets only `urai-staging`',
  'Actual protected Firebase staging deploy',
  'must remain unmerged'
]) {
  if (!launchBlockersText.includes(marker)) failures.push(`URAI_STAGING_LAUNCH_BLOCKERS.md must include ${marker}`);
}
rejectProjectIdentifiers('URAI_STAGING_LAUNCH_BLOCKERS.md', launchBlockersText);

const definitionOfDoneText = readText('URAI_STAGING_DEFINITION_OF_DONE.md');
for (const marker of [
  '`.firebaserc` maps `default` and `staging` to `urai-staging` and defines no production alias',
  '`firebase use urai-staging`',
  '`--project urai-staging`',
  '`https://urai-staging.web.app`',
  'not complete or live-verified'
]) {
  if (!definitionOfDoneText.includes(marker)) failures.push(`URAI_STAGING_DEFINITION_OF_DONE.md must include ${marker}`);
}
rejectProjectIdentifiers('URAI_STAGING_DEFINITION_OF_DONE.md', definitionOfDoneText);

const envExampleText = readText('.env.example');
for (const marker of [
  `URAI_STAGING_PROJECT_ID=${EXPECTED_STAGING_PROJECT}`,
  `URAI_STAGING_URL=${EXPECTED_STAGING_URL}`,
  'URAI_PRODUCTION_DEPLOY_APPROVED=0',
  `GOOGLE_CLOUD_PROJECT=${EXPECTED_STAGING_PROJECT}`,
  `GCLOUD_PROJECT=${EXPECTED_STAGING_PROJECT}`
]) {
  if (!envExampleText.includes(marker)) failures.push(`.env.example must include ${marker}`);
}
if (envExampleText.includes('URAI_PRODUCTION_PROJECT_ID=') || envExampleText.includes(PRODUCTION_PROJECT) || envExampleText.includes(DEPRECATED_STAGING_PROJECT)) {
  failures.push('.env.example must not expose production or deprecated project selectors');
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
if (!functionsIndexText.includes(`const STAGING_PROJECT_ID = '${EXPECTED_STAGING_PROJECT}'`)) {
  failures.push(`functions/src/index.ts must report staging project ${EXPECTED_STAGING_PROJECT}`);
}
if (!functionsIndexText.includes(`const STAGING_HOSTING_URL = '${EXPECTED_STAGING_URL}'`)) {
  failures.push(`functions/src/index.ts must report staging URL ${EXPECTED_STAGING_URL}`);
}
if (functionsIndexText.includes(DEPRECATED_STAGING_PROJECT)) {
  failures.push(`functions/src/index.ts must not reference deprecated project ${DEPRECATED_STAGING_PROJECT}`);
}

const publicIndexText = readText('public/index.html');
for (const requiredCopy of ['URAI Staging', 'Staging environment', 'not the production app', 'synthetic staging data only', 'companion', 'ground', '/api/healthz', '/api/buildinfo']) {
  if (!publicIndexText.includes(requiredCopy)) failures.push(`public/index.html must include ${requiredCopy}`);
}

const robotsText = readText('public/robots.txt');
if (!robotsText.includes('Disallow: /')) failures.push('public/robots.txt must disallow indexing for staging');

const javaRunnerText = readText('scripts/run-with-java.sh');
if (!javaRunnerText.includes('nix-shell') || !javaRunnerText.includes('command -v java')) {
  failures.push('scripts/run-with-java.sh must support both nix-shell and existing Java runtimes');
}

const lockScriptText = readText('scripts/urai-staging-lock.sh');
if (!lockScriptText.includes(EXPECTED_STAGING_PROJECT)) failures.push(`scripts/urai-staging-lock.sh must explicitly target ${EXPECTED_STAGING_PROJECT}`);
if (!lockScriptText.includes(`hosting:"$EXPECTED_HOSTING_SITE"`)) failures.push('scripts/urai-staging-lock.sh must deploy the explicit hosting site target');
if (lockScriptText.includes('URAI_PRODUCTION_PROJECT_ID') || lockScriptText.includes(PRODUCTION_PROJECT)) {
  failures.push('scripts/urai-staging-lock.sh must not reference production project selectors');
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