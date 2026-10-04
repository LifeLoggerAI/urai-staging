#!/usr/bin/env node
import fs from 'node:fs';

const path = '.github/workflows/staging-wif-runtime-identity-probe.yml';
const workflow = fs.readFileSync(path, 'utf8');
const failures = [];
for (const [label, pattern] of [
  ['main-only trigger', /branches:\s*\n\s*- main/m],
  ['protected staging environment', /^    environment: staging\s*$/m],
  ['OIDC permission', /^      id-token: write\s*$/m],
  ['production disabled', /URAI_PRODUCTION_DEPLOY_APPROVED: '0'/],
  ['WIF provider variable', /vars\.GCP_WIF_PROVIDER/],
  ['staging deploy SA variable', /vars\.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT/],
  ['ephemeral ADC', /create_credentials_file: true/],
  ['read-only provider evidence', /Provider read-only proof failed closed/],
  ['effective IAM command', /gcloud asset get-effective-iam-policy/],
  ['user-managed key rejection', /USER_MANAGED/],
  ['runtime identities', /runtimeIdentities/],
  ['mutation disabled', /mutationAuthorized:false/],
  ['no production deploy', /productionDeploymentPerformed:false/],
]) if (!pattern.test(workflow)) failures.push(label);
for (const forbidden of ['ADMIN_PR_NUMBER','refs/pull/57/head','fb255310d6b183a59e4252da80c685f45e5cf536','firebase deploy','credentials_json:']) {
  if (workflow.includes(forbidden)) failures.push(`forbidden stale/mutation path: ${forbidden}`);
}
if (failures.length) {
  console.error('Staging WIF runtime identity probe invalid:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PASS staging WIF runtime identity probe is main-bound, keyless, read-only, and independent of historical Admin PRs');
