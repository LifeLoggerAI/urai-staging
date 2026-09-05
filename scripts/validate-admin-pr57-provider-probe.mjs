#!/usr/bin/env node

import fs from 'node:fs';

const path = '.github/workflows/admin-pr57-provider-probe.yml';
const workflow = fs.readFileSync(path, 'utf8');
const failures = [];

for (const [label, pattern] of [
  ['main-only trigger', /branches:\s*\n\s*- main/m],
  ['protected staging environment', /^    environment: staging\s*$/m],
  ['OIDC permission', /^      id-token: write\s*$/m],
  ['exact Admin repo', /ADMIN_REPOSITORY: LifeLoggerAI\/urai-admin/],
  ['exact Admin PR', /ADMIN_PR_NUMBER: '57'/],
  ['exact Admin SHA', /ADMIN_SHA: fb255310d6b183a59e4252da80c685f45e5cf536/],
  ['production disabled', /URAI_PRODUCTION_DEPLOY_APPROVED: '0'/],
  ['WIF provider variable', /vars\.GCP_WIF_PROVIDER/],
  ['staging deploy SA variable', /vars\.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT/],
  ['ephemeral ADC', /create_credentials_file: true/],
  ['credential destroy', /Destroy ephemeral WIF credential before evidence handoff/],
  ['read-only provider mode', /probeMode: 'provider-read-only'/],
  ['mutation disabled', /mutationAuthorized: false/],
  ['no production deploy', /productionDeploymentPerformed: false/],
  ['effective IAM command', /gcloud asset get-effective-iam-policy/],
  ['effective IAM project scope', /--scope="projects\/\$STAGING_PROJECT_ID"/],
  ['effective IAM project resource', /cloudresourcemanager\.googleapis\.com\/projects\/\$project_number/],
  ['required provider reads complete', /requiredProviderReadsComplete: true/],
  ['effective IAM readback receipt', /effectiveIamReadback: true/],
  ['effective Owner Editor receipt', /effectiveOwnerEditorBindings/],
  ['group or broad principal uncertainty', /Owner\/Editor group\/broad-principal membership cannot be disproven/],
  ['authenticated principal binding', /activePrincipal !== process\.env\.DEPLOY_SERVICE_ACCOUNT/],
  ['provider resource binding', /provider\.name !== process\.env\.WIF_PROVIDER/],
  ['user-managed key rejection', /userManagedKeys\.length/],
  ['provider proof fail closed', /Provider read-only proof failed closed/],
]) {
  if (!pattern.test(workflow)) failures.push(`missing provider-probe boundary: ${label}`);
}

if (/^\s+paths:\s*$/m.test(workflow)) {
  failures.push('provider probe must run on every main SHA; push path filters are forbidden');
}

for (const forbidden of [
  'FIREBASE_SERVICE_ACCOUNT_KEY: ${{',
  'FIREBASE_TOKEN: ${{',
  'credentials_json:',
  'gcloud projects add-iam-policy-binding',
  'gcloud iam service-accounts add-iam-policy-binding',
  'firebase deploy',
]) {
  if (workflow.includes(forbidden)) failures.push(`forbidden provider-probe mutation/credential path: ${forbidden}`);
}

if (/ownerEditorNegativeProof:\s*broadRoleReliance\.length\s*===\s*0/.test(workflow)) {
  failures.push('direct project IAM must not be represented as effective Owner/Editor negative proof');
}

if (failures.length) {
  console.error('Admin PR57 provider probe definition is invalid:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS Admin PR57 provider probe is exact-head, WIF-only, staging-only, read-only, complete-read, effective-IAM fail-closed, and runs on every staging main SHA');
