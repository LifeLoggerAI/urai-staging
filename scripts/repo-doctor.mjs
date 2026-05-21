#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const errors = [];
const warnings = [];

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

if (!fs.existsSync(packagePath)) {
  errors.push('No package.json found. Run this from the root of LifeLoggerAI/urai-staging.');
} else {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (pkg.name !== 'urai-staging') {
    errors.push(`This appears to be '${pkg.name}', not the URAI staging shell. For staging checks, cd into LifeLoggerAI/urai-staging.`);
  }
  for (const script of ['launch:p0', 'launch:p0:commands', 'check:deploy', 'deploy:staging']) {
    if (!pkg.scripts?.[script]) errors.push(`Missing package script: ${script}`);
  }
}

if (process.env.NPM_CONFIG_PREFIX) {
  warnings.push(`NPM_CONFIG_PREFIX is set to '${process.env.NPM_CONFIG_PREFIX}'. Run: unset NPM_CONFIG_PREFIX`);
}

if (!exists('firebase.json')) errors.push('Missing firebase.json.');
if (!exists('functions/package.json')) errors.push('Missing functions/package.json.');
if (!exists('scripts/launch-p0.mjs')) errors.push('Missing scripts/launch-p0.mjs.');
if (!exists('scripts/urai-staging-lock.sh')) errors.push('Missing scripts/urai-staging-lock.sh.');

if (warnings.length) {
  console.warn('URAI staging repo doctor warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('URAI staging repo doctor failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('URAI staging repo doctor passed. You are in the Firebase staging shell repo.');
console.log('For full product V1 checks, cd into LifeLoggerAI/UrAi.');
console.log('Staging commands:');
console.log('  unset NPM_CONFIG_PREFIX');
console.log('  npm install');
console.log('  npm --prefix functions install');
console.log('  npm run launch:p0');
console.log('  URAI_P0_RUN_COMMANDS=1 npm run launch:p0:commands');
