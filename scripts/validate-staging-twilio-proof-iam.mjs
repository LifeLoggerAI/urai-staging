import fs from 'node:fs';

const workflowPath = '.github/workflows/communications-pr53-twilio-trial-e2e.yml';
const bootstrapPath = 'scripts/bootstrap-staging-twilio-proof-iam.sh';
const workflow = fs.readFileSync(workflowPath, 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const failures = [];

for (const required of [
  'Version only pre-created staging Twilio secrets',
  'gcloud secrets versions add TWILIO_AUTH_TOKEN',
  'gcloud secrets versions add TWILIO_ACCOUNT_SID'
]) {
  if (!workflow.includes(required)) failures.push(`workflow missing: ${required}`);
}

for (const forbidden of [
  'gcloud secrets create "$secret_name"',
  'roles/secretmanager.admin',
  'roles/secretmanager.secretAccessor'
]) {
  if (workflow.includes(forbidden)) failures.push(`workflow forbidden authority: ${forbidden}`);
}

for (const required of [
  "PROJECT_ID='urai-staging'",
  "SERVICE_ACCOUNT_ID='urai-staging-github-deployer'",
  'TWILIO_AUTH_TOKEN TWILIO_ACCOUNT_SID',
  "roles/secretmanager.secretVersionAdder",
  'gcloud secrets create "$secret_name"',
  'gcloud secrets add-iam-policy-binding "$secret_name"',
  'broad_secret_roles_granted=false'
]) {
  if (!bootstrap.includes(required)) failures.push(`bootstrap missing: ${required}`);
}

for (const forbidden of [
  "roles/secretmanager.admin",
  "roles/secretmanager.secretAccessor",
  "roles/owner",
  "roles/editor",
  "cloudfunctions.developer",
  "iam.serviceAccountUser"
]) {
  const isGuardLiteral = bootstrap.includes(`'${forbidden}'`) && bootstrap.includes('const forbidden = new Set');
  if (bootstrap.includes(forbidden) && !isGuardLiteral) failures.push(`bootstrap grants or references forbidden mutation role outside guard: ${forbidden}`);
}

if (failures.length) {
  console.error(`staging Twilio proof IAM contract invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging Twilio proof IAM contract OK');
