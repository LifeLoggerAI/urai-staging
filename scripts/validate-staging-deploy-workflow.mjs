#!/usr/bin/env node

import fs from 'node:fs';

const workflowPath = '.github/workflows/staging-deploy.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');
const failures = [];
const lines = workflow.split(/\r?\n/);
const activeWorkflow = lines.filter((line) => !line.trimStart().startsWith('#')).join('\n');

const deployStart = lines.findIndex((line) => /^  deploy:\s*$/.test(line));
const deployEnd = deployStart < 0
  ? -1
  : lines.findIndex((line, index) => index > deployStart && /^  [A-Za-z0-9_-]+:\s*$/.test(line));
const deployBlock = deployStart < 0
  ? ''
  : lines.slice(deployStart, deployEnd < 0 ? lines.length : deployEnd).join('\n');

for (const [label, pattern] of [
  ['manual dispatch', /^  workflow_dispatch:\s*$/m],
  ['deploy environment', /^    environment: staging\s*$/m],
  ['deploy OIDC permission', /^      id-token: write\s*$/m],
  ['external prebuilt root', /^      PREBUILT_ROOT: \/tmp\/urai-staging-prebuilt\s*$/m],
  ['WIF provider', /^          workload_identity_provider: \$\{\{ vars\.GCP_WIF_PROVIDER \}\}\s*$/m],
  ['WIF service account', /^          service_account: \$\{\{ vars\.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT \}\}\s*$/m],
  ['ephemeral ADC file', /^          create_credentials_file: true\s*$/m],
]) {
  const scope = label === 'manual dispatch' ? activeWorkflow : deployBlock;
  if (!pattern.test(scope)) failures.push(`missing required staging boundary: ${label}`);
}

if (!/^  URAI_PRODUCTION_DEPLOY_APPROVED: '0'\s*$/m.test(activeWorkflow)) {
  failures.push('missing fail-closed production deployment approval');
}

if (/PREBUILT_ROOT:\s*\$\{\{[^\n}]*runner\.temp/i.test(activeWorkflow)) {
  failures.push('runner.temp cannot be evaluated from job-level env');
}

for (const forbidden of [
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GCP_SERVICE_ACCOUNT_KEY',
  'service_account_key',
]) {
  if (activeWorkflow.includes(forbidden)) failures.push(`forbidden stored credential path: ${forbidden}`);
}

if (failures.length) {
  console.error('Staging deploy workflow definition is invalid:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS staging deploy workflow definition and WIF-only credential boundary');
