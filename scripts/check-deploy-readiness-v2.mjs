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
  '.github/workflows/staging-deploy.yml',
  '.github/workflows/urai-production-verify.yml',
  'ENVIRONMENT_AUTHORITY.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

function text(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
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

const firebaserc = json('.firebaserc');
if (firebaserc) {
  const projects = firebaserc.projects ?? {};
  if (projects.default !== expectedProject) failures.push(`.firebaserc default must be ${expectedProject}`);
  if (projects.staging !== expectedProject) failures.push(`.firebaserc staging must be ${expectedProject}`);
  const aliases = Object.keys(projects);
  const unexpected = aliases.filter((alias) => !['default', 'staging'].includes(alias));
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
}

const rootPackage = json('package.json');
if (rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  if (!scripts['check:deploy']?.includes('check-deploy-readiness-v2.mjs')) failures.push('check:deploy must use semantic v2 readiness gate');
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
  'K_REVISION',
]);

requirePhrases('functions/src/index.ts', [
  "from './lib/stagingBoundaries'",
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
if (functionsIndex.includes("doc(email)")) failures.push('Waitlist document IDs must not contain raw email addresses');

requirePhrases('scripts/smoke-staging.sh', [
  'URAI_RELEASE_CANDIDATE_SHA is required for exact runtime smoke',
  'releaseCandidateSha',
  'deployedAt must be a real ISO-8601 deployment timestamp',
  'Default release smoke is intentionally non-mutating',
  '/api/companion',
  '/api/waitlist',
]);
const smoke = text('scripts/smoke-staging.sh');
if (smoke.includes('launch-smoke@example.com')) failures.push('Default smoke must not perform a successful waitlist write');
if (smoke.includes('Staging smoke check')) failures.push('Default smoke must not perform a successful companion write');

requirePhrases('scripts/urai-staging-lock.sh', [
  'git merge-base --is-ancestor',
  'git status --porcelain --untracked-files=all',
  'firebase hosting:sites:list --project "$EXPECTED_PROJECT_ID" --json',
  'ALLOW_CREATE_STAGING_HOSTING_SITE',
  'sha256sum "$DEPLOY_LOG_FILE"',
  'URAI_RELEASE_CANDIDATE_SHA="$RELEASE_SHA"',
  'non-mutating live smoke',
  'Exact /api/buildinfo source-SHA and deployment-timestamp match',
]);
const lock = text('scripts/urai-staging-lock.sh');
if (lock.includes('firebase hosting:sites:create')) failures.push('Deploy lock must not create Hosting infrastructure');
if (lock.includes('firebase use "$EXPECTED_PROJECT_ID"')) failures.push('Deploy lock must not mutate Firebase active-project state');

requirePhrases('.github/workflows/staging-deploy.yml', [
  'expected_sha:',
  'rollback_sha:',
  'environment: staging',
  'ref: ${{ inputs.expected_sha }}',
  'persist-credentials: false',
  'git merge-base --is-ancestor',
  'URAI_PRODUCTION_DEPLOY_APPROVED: "0"',
  'ALLOW_CREATE_STAGING_HOSTING_SITE: "0"',
  'Credential project mismatch',
  'Remove staging credential file',
]);

requirePhrases('.github/workflows/urai-production-verify.yml', [
  'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
  'persist-credentials: false',
  'Setup Java for Firebase emulators',
  'node scripts/urai-staging-bootstrap.mjs',
  'node scripts/validate-launch-evidence.mjs',
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
