#!/usr/bin/env node

import fs from 'node:fs';

const workflowPath = '.github/workflows/staging-deploy.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');
const failures = [];

for (const required of [
  'workflow_dispatch:',
  'PREBUILT_ROOT: /tmp/urai-staging-prebuilt',
  'environment: staging',
  'id-token: write',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ vars.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'URAI_PRODUCTION_DEPLOY_APPROVED: \'0\'',
]) {
  if (!workflow.includes(required)) failures.push(`missing required staging boundary: ${required}`);
}

if (/PREBUILT_ROOT:\s*\$\{\{\s*runner\.temp\s*\}\}/.test(workflow)) {
  failures.push('runner.temp cannot be evaluated from job-level env');
}

for (const forbidden of [
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GCP_SERVICE_ACCOUNT_KEY',
  'service_account_key',
]) {
  if (workflow.includes(forbidden)) failures.push(`forbidden stored credential path: ${forbidden}`);
}

if (failures.length) {
  console.error('Staging deploy workflow definition is invalid:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS staging deploy workflow definition and WIF-only credential boundary');
