import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/admin-pr57-runtime-deploy.yml', 'utf8');
const lock = fs.readFileSync('scripts/admin-pr57-staging-lock.sh', 'utf8');
const failures = [];

function requireText(text, value, label) {
  if (!text.includes(value)) failures.push(`missing ${label}`);
}
function requirePattern(text, pattern, label) {
  if (!pattern.test(text)) failures.push(`missing ${label}`);
}
function forbidPattern(text, pattern, label) {
  if (pattern.test(text)) failures.push(`forbidden ${label}`);
}

for (const [value, label] of [
  ['name: Admin PR57 Governed Staging Runtime Deploy', 'workflow name'],
  ['environment: staging', 'protected staging environment'],
  ['ADMIN_REPOSITORY: LifeLoggerAI/urai-admin', 'Admin repository'],
  ['STAGING_PROJECT_ID: urai-staging', 'staging project'],
  ["URAI_PRODUCTION_DEPLOY_APPROVED: '0'", 'production fence'],
  ['refs/pull/57/head', 'exact PR ref'],
  ['workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}', 'WIF provider variable'],
  ['service_account: ${{ vars.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT }}', 'staging deploy service account variable'],
  ['create_credentials_file: true', 'ephemeral ADC'],
  ['roles/owner', 'Owner rejection'],
  ['roles/editor', 'Editor rejection'],
  ["key.keyType === 'USER_MANAGED'", 'user-managed key rejection'],
  ['bash scripts/admin-pr57-staging-lock.sh', 'runtime lock invocation'],
  ['manifest.adminSha !== process.env.ADMIN_SHA', 'prebuilt Admin SHA binding'],
  ['manifest.controllerSha !== process.env.CONTROLLER_SHA', 'prebuilt controller SHA binding'],
  ['test -z "${FIREBASE_TOKEN:-}"', 'FIREBASE_TOKEN absence'],
  ['test -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}"', 'service-account key absence'],
  ['test -z "${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}"', 'raw ADC JSON absence'],
]) requireText(workflow, value, label);

requirePattern(workflow, /initialFunctionDeploymentAllowlist[\s\S]{0,800}nextServer/, 'exact nextServer allowlist check');
requirePattern(workflow, /scheduledAnalyticsDeploymentAuthorized\s*!==\s*false/, 'scheduled analytics denial');
requirePattern(workflow, /hostingLiveChannelMutationAuthorized\s*!==\s*false/, 'live Hosting denial');
requirePattern(workflow, /projectWideRuleMutationAuthorized\s*!==\s*false/, 'project-wide rule denial');
requirePattern(workflow, /urai-admin-pr57-runtime-prebuilt-\$\{\{[^\n]+ADMIN_SHA[^\n]+\}\}-\$\{\{\s*github\.run_id\s*\}\}/, 'source-bound prebuilt artifact name');

for (const [value, label] of [
  ["EXPECTED_PROJECT_ID='urai-staging'", 'lock staging project'],
  ["EXPECTED_ENVIRONMENT='staging'", 'lock staging environment'],
  ["EXPECTED_CONSUMER_ID='urai-admin-pr57-runtime-closure'", 'consumer identity'],
  ['firebase hosting:channel:deploy "$CHANNEL_ID"', 'preview channel deployment'],
  ['--expires 1d', 'preview expiration'],
  ['scheduledAnalyticsDeployed: false', 'receipt scheduled analytics denial'],
  ['projectWideFirestoreRulesMutated: false', 'receipt Firestore denial'],
  ['projectWideStorageRulesMutated: false', 'receipt Storage denial'],
  ['hostingLiveChannelMutated: false', 'receipt live Hosting denial'],
  ['productionDeploymentPerformed: false', 'receipt production denial'],
  ['URAI_ADMIN_SOURCE_SHA=$ADMIN_SHA', 'runtime Admin SHA marker'],
  ['URAI_STAGING_CONTROLLER_SHA=$CONTROLLER_SHA', 'runtime controller SHA marker'],
  ['URAI_PRODUCTION_DEPLOY_APPROVED=0', 'runtime production fence'],
  ['Existing nextServer is not authorized for replacement', 'collision fail-closed check'],
  ['Existing nextServer SHA marker does not match the explicitly expected prior Admin SHA', 'prior SHA replacement binding'],
]) requireText(lock, value, label);

requirePattern(lock, /CHANNEL_ID="admin-pr57-\$\{ADMIN_SHA:0:12\}"/, 'Admin-SHA-bound preview channel');
requirePattern(lock, /\[\s*"\$\{GITHUB_REF:-\}"\s*=\s*'refs\/heads\/main'\s*\]/, 'main-only mutation authority');
requirePattern(lock, /\[\s*-z\s+"\$\{FIREBASE_TOKEN:-\}"\s*\]/, 'lock FIREBASE_TOKEN absence');
requirePattern(lock, /\[\s*-z\s+"\$\{FIREBASE_SERVICE_ACCOUNT_KEY:-\}"\s*\]/, 'lock service-account key absence');
requirePattern(lock, /\[\s*-z\s+"\$\{GOOGLE_APPLICATION_CREDENTIALS_JSON:-\}"\s*\]/, 'lock raw ADC JSON absence');
requirePattern(lock, /firebase\s+deploy\s+\\[\s\S]{0,120}--only\s+functions:nextServer\b/, 'nextServer-only Firebase deploy');

for (const [pattern, label] of [
  [/^\s*FIREBASE_TOKEN\s*:/m, 'FIREBASE_TOKEN YAML key'],
  [/^\s*FIREBASE_SERVICE_ACCOUNT_KEY\s*:/m, 'service-account key YAML key'],
  [/^\s*credentials_json\s*:/m, 'credentials_json input'],
  [/--project\s+urai-4dc1d/, 'production project target'],
  [/^\s*environment:\s*production\s*$/m, 'production environment'],
  [/--only\s+firestore/, 'Firestore deploy'],
  [/--only\s+storage/, 'Storage deploy'],
  [/hosting:channel:deploy\s+live\b/, 'live Hosting channel deploy'],
  [/firebase\s+deploy\s+\\[\s\S]{0,120}--only\s+functions(?:\s|\\|$)/, 'unscoped all-functions deploy'],
  [/firebase\s+deploy\s+\\[\s\S]{0,160}--only\s+hosting(?::[^,\s]+)?(?:,|\s|\\|$)/, 'live Hosting deploy'],
]) {
  forbidPattern(workflow, pattern, label);
  forbidPattern(lock, pattern, label);
}

if (failures.length) {
  console.error(`Admin PR57 governed runtime deployment contract invalid: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('Admin PR57 governed staging runtime deployment contract OK');
