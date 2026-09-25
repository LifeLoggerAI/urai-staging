import fs from 'node:fs';

const path = 'scripts/promote-staging-twilio-function-deploy-iam.sh';
const source = fs.readFileSync(path, 'utf8');
const failures = [];

for (const required of [
  "PROJECT_ID='urai-staging'",
  "DEPLOY_SERVICE_ACCOUNT='urai-staging-github-deployer@urai-staging.iam.gserviceaccount.com'",
  'RUNTIME_SERVICE_ACCOUNT_EMAIL',
  "CONFIRM_STAGING_FUNCTION_DEPLOY_IAM=urai-staging-functions-only",
  "roles/cloudfunctions.admin",
  "roles/iam.serviceAccountUser",
  'Runtime service account must belong to urai-staging.',
  'production_authority=false',
  'secret_admin_authority=false'
]) {
  if (!source.includes(required)) failures.push(`missing: ${required}`);
}

for (const role of [
  'roles/owner',
  'roles/editor',
  'roles/secretmanager.admin',
  'roles/firebase.admin'
]) {
  if (!source.includes(`'${role}'`)) failures.push(`missing forbidden-role readback guard: ${role}`);
}

for (const forbidden of [
  'roles/secretmanager.secretAccessor',
  'roles/secretmanager.secretVersionManager',
  'roles/iam.serviceAccountAdmin',
  'roles/resourcemanager.projectIamAdmin'
]) {
  if (source.includes(forbidden)) failures.push(`forbidden promotion authority: ${forbidden}`);
}

if (failures.length) {
  console.error(`staging function deploy IAM promotion contract invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging function deploy IAM promotion contract OK');
