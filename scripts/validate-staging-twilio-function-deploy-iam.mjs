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
  'secret_admin_authority=false',
  'gcloud secrets add-iam-policy-binding "$secret_name"',
  "roles/secretmanager.secretAccessor",
  'runtime_secret_access_scope=TWILIO_AUTH_TOKEN,TWILIO_ACCOUNT_SID',
  'runtime_secret_accessor_only=true',
  'PRE_PROJECT_POLICY',
  'refusing IAM promotion before mutation',
  'broad_deploy_project_roles=false',
  'broad_runtime_project_roles=false'
]) {
  if (!source.includes(required)) failures.push(`missing: ${required}`);
}

for (const role of [
  'roles/owner',
  'roles/editor',
  'roles/secretmanager.admin',
  'roles/secretmanager.secretAccessor',
  'roles/firebase.admin'
]) {
  if (!source.includes(`'${role}'`)) failures.push(`missing forbidden-role readback guard: ${role}`);
}

for (const forbidden of [
  'roles/secretmanager.secretVersionManager',
  'roles/iam.serviceAccountAdmin',
  'roles/resourcemanager.projectIamAdmin'
]) {
  if (source.includes(forbidden)) failures.push(`forbidden promotion authority: ${forbidden}`);
}

const preflightIndex = source.indexOf('PRE_PROJECT_POLICY=');
const firstMutationIndex = Math.min(
  ...[
    source.indexOf('gcloud projects add-iam-policy-binding "$PROJECT_ID"'),
    source.indexOf('gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SERVICE_ACCOUNT_EMAIL"'),
    source.indexOf('gcloud secrets add-iam-policy-binding "$secret_name"')
  ].filter((index) => index >= 0)
);
if (preflightIndex < 0 || firstMutationIndex < 0 || preflightIndex > firstMutationIndex) failures.push('broad-role preflight must run before IAM mutation');
if (!source.includes('members.includes(runtimeMember)')) failures.push('runtime project-role readback guard missing');
if (!source.includes('members.includes(deployMember)')) failures.push('deploy project-role readback guard missing');

const runtimeSecretGrant = /gcloud secrets add-iam-policy-binding "\$secret_name"[\s\S]*?--member="serviceAccount:\$RUNTIME_SERVICE_ACCOUNT_EMAIL"[\s\S]*?--role='roles\/secretmanager\.secretAccessor'/;
if (!runtimeSecretGrant.test(source)) failures.push('runtime Twilio secretAccessor grant must be resource-scoped to runtime identity');
const commandBlocks = source.split(/\n\s*\n/);
if (commandBlocks.some((block) =>
  block.includes('gcloud secrets add-iam-policy-binding') &&
  block.includes('--member="serviceAccount:$DEPLOY_SERVICE_ACCOUNT"') &&
  block.includes("roles/secretmanager.secretAccessor")
)) failures.push('deploy identity must not receive secretAccessor');

if (failures.length) {
  console.error(`staging function deploy IAM promotion contract invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging function deploy IAM promotion contract OK');
