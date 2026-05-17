#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EXPECTED_STAGING_PROJECT = 'urai-staging-35414255';
const FORBIDDEN_PRODUCTION_PROJECT = 'urai-4dc1d';
const requiredFiles = [
  '.firebaserc',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'functions/package.json',
  'functions/src/index.ts',
  'public/index.html',
  'scripts/urai-staging-lock.sh',
  'scripts/smoke-staging.sh',
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

const firebaserc = readJson('.firebaserc');
if (firebaserc) {
  if (firebaserc.projects?.staging !== EXPECTED_STAGING_PROJECT) {
    failures.push(`.firebaserc projects.staging must be ${EXPECTED_STAGING_PROJECT}`);
  }
  if (firebaserc.projects?.default !== EXPECTED_STAGING_PROJECT) {
    failures.push(`.firebaserc projects.default must be ${EXPECTED_STAGING_PROJECT}`);
  }
  if (firebaserc.projects?.production === EXPECTED_STAGING_PROJECT) {
    failures.push('.firebaserc production alias must not point at staging');
  }
}

const firebaseJson = readJson('firebase.json');
if (firebaseJson) {
  if (!firebaseJson.hosting?.public) failures.push('firebase.json must define hosting.public');
  if (!firebaseJson.functions?.source) failures.push('firebase.json must define functions.source');
  if (firebaseJson.firestore?.rules !== 'firestore.rules') failures.push('firebase.json must deploy firestore.rules');
  if (firebaseJson.firestore?.indexes !== 'firestore.indexes.json') failures.push('firebase.json must deploy firestore.indexes.json');
}

const rootPackage = readJson('package.json');
if (rootPackage) {
  const deployScript = rootPackage.scripts?.['deploy:staging'] ?? '';
  const lockScript = rootPackage.scripts?.['lock:staging'] ?? '';
  if (!deployScript.includes('lock:staging')) failures.push('package.json deploy:staging must delegate to lock:staging');
  if (!lockScript.includes('scripts/urai-staging-lock.sh')) failures.push('package.json lock:staging must run scripts/urai-staging-lock.sh');
}

const lockScriptText = existsSync('scripts/urai-staging-lock.sh') ? readFileSync('scripts/urai-staging-lock.sh', 'utf8') : '';
if (lockScriptText.includes(FORBIDDEN_PRODUCTION_PROJECT)) {
  failures.push('scripts/urai-staging-lock.sh must not contain the production project id');
}
if (!lockScriptText.includes(EXPECTED_STAGING_PROJECT)) {
  failures.push(`scripts/urai-staging-lock.sh must explicitly target ${EXPECTED_STAGING_PROJECT}`);
}

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

console.log(`URAI staging deploy readiness passed for ${EXPECTED_STAGING_PROJECT}.`);
