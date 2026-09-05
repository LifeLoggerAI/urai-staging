import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/admin-pr57-runtime-deploy.yml', 'utf8');
const lock = fs.readFileSync('scripts/admin-pr57-staging-lock.sh', 'utf8');

const requiredWorkflowMarkers = [
  'name: Admin PR57 Governed Staging Runtime Deploy',
  'environment: staging',
  'ADMIN_REPOSITORY: LifeLoggerAI/urai-admin',
  'STAGING_PROJECT_ID: urai-staging',
  "URAI_PRODUCTION_DEPLOY_APPROVED: '0'",
  'refs/pull/57/head',
  'initialFunctionDeploymentAllowlist',
  "JSON.stringify(['nextServer'])",
  'scheduledAnalyticsDeploymentAuthorized !== false',
  'hostingLiveChannelMutationAuthorized !== false',
  'projectWideRuleMutationAuthorized !== false',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ vars.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'roles/owner',
  'roles/editor',
  "key.keyType === 'USER_MANAGED'",
  'bash scripts/admin-pr57-staging-lock.sh',
  'urai-admin-pr57-runtime-prebuilt-',
  'manifest.adminSha !== process.env.ADMIN_SHA',
  'manifest.controllerSha !== process.env.CONTROLLER_SHA',
  'test -z "${FIREBASE_TOKEN:-}"',
  'test -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}"',
  'test -z "${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}"',
];
for (const marker of requiredWorkflowMarkers) {
  if (!workflow.includes(marker)) throw new Error(`missing Admin runtime workflow marker: ${marker}`);
}

const requiredLockMarkers = [
  "EXPECTED_PROJECT_ID='urai-staging'",
  "EXPECTED_ENVIRONMENT='staging'",
  "EXPECTED_CONSUMER_ID='urai-admin-pr57-runtime-closure'",
  "CHANNEL_ID=\"admin-pr57-${ADMIN_SHA:0:12}\"",
  "[ \"${GITHUB_REF:-}\" = 'refs/heads/main' ]",
  "[ -z \"${FIREBASE_TOKEN:-}\" ]",
  "[ -z \"${FIREBASE_SERVICE_ACCOUNT_KEY:-}\" ]",
  "[ -z \"${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}\" ]",
  'firebase deploy \\\n    --only functions:nextServer',
  'firebase hosting:channel:deploy "$CHANNEL_ID"',
  '--expires 1d',
  'scheduledAnalyticsDeployed: false',
  'projectWideFirestoreRulesMutated: false',
  'projectWideStorageRulesMutated: false',
  'hostingLiveChannelMutated: false',
  'productionDeploymentPerformed: false',
  'URAI_ADMIN_SOURCE_SHA=$ADMIN_SHA',
  'URAI_STAGING_CONTROLLER_SHA=$CONTROLLER_SHA',
  'URAI_PRODUCTION_DEPLOY_APPROVED=0',
  'Existing nextServer is not authorized for replacement',
  'Existing nextServer SHA marker does not match the explicitly expected prior Admin SHA',
];
for (const marker of requiredLockMarkers) {
  if (!lock.includes(marker)) throw new Error(`missing Admin runtime lock marker: ${marker}`);
}

const forbidden = [
  [/^\s*FIREBASE_TOKEN\s*:/m, 'FIREBASE_TOKEN YAML key'],
  [/^\s*FIREBASE_SERVICE_ACCOUNT_KEY\s*:/m, 'service-account key YAML key'],
  [/^\s*credentials_json\s*:/m, 'credentials_json input'],
  [/--project\s+urai-4dc1d/, 'production project target'],
  [/environment:\s*production/, 'production environment'],
  [/--only\s+functions\s*(?:\\\s*)?$/m, 'unscoped all-functions deploy'],
  [/--only\s+firestore/, 'Firestore deploy'],
  [/--only\s+storage/, 'Storage deploy'],
  [/hosting:channel:deploy\s+live/, 'live Hosting channel deploy'],
  [/firebase\s+deploy[^\n]*hosting(?::[^,\s]+)?(?:,|\s)/, 'live Hosting deploy'],
];
for (const [pattern, label] of forbidden) {
  if (pattern.test(workflow) || pattern.test(lock)) throw new Error(`forbidden Admin runtime deployment marker: ${label}`);
}

console.log('Admin PR57 governed staging runtime deployment contract OK');
