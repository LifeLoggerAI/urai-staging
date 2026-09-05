#!/usr/bin/env node
import fs from 'node:fs';

const path = 'scripts/bootstrap-staging-github-wif.sh';
const source = fs.readFileSync(path, 'utf8');
const failures = [];
for (const [label, marker] of [
  ['staging project', "PROJECT_ID='urai-staging'"],
  ['dedicated pool', "POOL_ID='urai-github-staging'"],
  ['GitHub issuer', 'https://token.actions.githubusercontent.com'],
  ['owner ID restriction', "GITHUB_OWNER_ID='215797546'"],
  ['repository ID restriction', "GITHUB_REPOSITORY_ID='1150947098'"],
  ['main ref restriction', "EXPECTED_REF='refs/heads/main'"],
  ['staging environment restriction', "EXPECTED_ENVIRONMENT='staging'"],
  ['workloadIdentityUser', 'roles/iam.workloadIdentityUser'],
  ['Cloud Asset API staging enablement', 'gcloud services enable cloudasset.googleapis.com --project="$PROJECT_ID"'],
  ['Cloud Asset viewer', 'roles/cloudasset.viewer'],
  ['IAM role viewer', 'roles/iam.roleViewer'],
  ['service usage consumer', 'roles/serviceusage.serviceUsageConsumer'],
  ['effective IAM readback marker', 'effective_iam_readback=cloudasset.googleapis.com'],
  ['user-key rejection', 'USER_KEYS='],
  ['WIF variable output', 'GCP_WIF_PROVIDER='],
  ['service-account variable output', 'GCP_STAGING_DEPLOY_SERVICE_ACCOUNT='],
]) {
  if (!source.includes(marker)) failures.push(`missing WIF bootstrap boundary: ${label}`);
}
for (const forbidden of [
  'roles/owner',
  'roles/editor',
  'service-accounts keys create',
  'FIREBASE_TOKEN',
  'credentials_json',
  'private_key',
]) {
  if (source.includes(forbidden)) failures.push(`forbidden WIF bootstrap path: ${forbidden}`);
}
if (!source.includes("assertion.repository_id=='${GITHUB_REPOSITORY_ID}'")) failures.push('provider condition must bind repository ID');
if (!source.includes("assertion.ref=='${EXPECTED_REF}'")) failures.push('provider condition must bind main ref');
if (!source.includes("assertion.environment=='${EXPECTED_ENVIRONMENT}'")) failures.push('provider condition must bind staging environment');
if (failures.length) {
  console.error('Staging WIF bootstrap contract invalid:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('PASS staging WIF bootstrap is keyless, staging-only, repository/ref/environment bound, and effective-IAM-read capable');
