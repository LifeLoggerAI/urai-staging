#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const functionsPackage = JSON.parse(readFileSync('functions/package.json', 'utf8'));

if (rootPackage.private !== true) failures.push('Root package.json must remain private.');
if (rootPackage.engines?.node !== '20') failures.push('Root package.json must lock Node engine to 20.');
if (functionsPackage.engines?.node !== '20') failures.push('functions/package.json must lock Node engine to 20.');

const acceptableLockfiles = [
  'functions/package-lock.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock'
];

if (!acceptableLockfiles.some((file) => existsSync(file))) {
  failures.push('No lockfile detected. Run npm --prefix functions install or npm --prefix functions ci from a checkout with package-lock.json committed before release.');
}

if (failures.length > 0) {
  console.error('URAI lockfile check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('URAI lockfile and package engine check passed.');
