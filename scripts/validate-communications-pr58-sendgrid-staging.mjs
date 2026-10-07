import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflowPath = '.github/workflows/communications-pr58-sendgrid-staging-e2e.yml';
const bootstrapPath = 'scripts/bootstrap-staging-sendgrid-proof-iam.sh';
const text = fs.readFileSync(workflowPath, 'utf8');
const callbackHelper = fs.readFileSync('scripts/verify-sendgrid-staging-callback.mjs', 'utf8');
const bindingHelper = fs.readFileSync('scripts/verify-staging-verification-binding.mjs','utf8');
const sourceRefHelper = fs.readFileSync('scripts/assert-current-communications-source.sh','utf8');
const authorityText = `${text}\n${callbackHelper}\n${bindingHelper}\n${sourceRefHelper}`;
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const required = [
  'name: Communications selected SendGrid Signed Protected Staging E2E',
  'workflow_dispatch:',
  'environment: staging',
  'LifeLoggerAI/urai-communications',
  '759f664cdf00a48272f5401b7cfc45bbd8afb537',
  '274f53573f4d3bf843047e285f080083a55fe1ab',
  "STAGING_REVIEW_PR_NUMBER: '109'",
  'verify-staging-verification-binding.mjs',
  'working-pr84',
  'SENDGRID_API_KEY',
  'URAI_CROSS_REPO_READ_TOKEN',
  'URAI_CROSS_REPO_READ_SSH_KEY',
  'git ls-remote git@github.com:LifeLoggerAI/urai-communications.git "refs/heads/$COMMUNICATIONS_BRANCH"',
  'ssh-key: ${{ secrets.URAI_CROSS_REPO_READ_SSH_KEY }}',
  'SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY',
  'DELIVERY_STATUS_CALLBACK_SECRET',
  'FUNCTIONS_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_SERVICE_ACCOUNT',
  'callback runtime service account mismatch',
  'functions:deliveryStatusCallback',
  'https://api.sendgrid.com/v3/user/webhooks/event/settings',
  'https://api.sendgrid.com/v3/user/webhooks/event/settings/signed/',
  'https://api.sendgrid.com/v3/user/webhooks/event/test',
  'DELETE',
  'cleanup_failed=0',
  'Temporary SendGrid webhook cleanup failed with HTTP',
  'test "$cleanup_failed" -eq 0',
  'UrAi Staging Signed Proof',
  'export STAGING_CALLBACK_URL="$callback_url"',
  'https://us-central1-urai-staging.cloudfunctions.net',
  'SENDGRID_PROOF_FRIENDLY_NAME',
  'sendgrid-before.json',
  'mandatory cleanup will reconcile by run-unique identity',
  'Delete and reconcile temporary SendGrid webhook',
  'sendgrid-after-cleanup.json',
  '--connect-timeout 10 --max-time 30',
  'timeout --kill-after=5s 45s gcloud secrets describe',
  'timeout --kill-after=5s 60s gcloud secrets versions add SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY',
  'timeout --kill-after=5s 60s gcloud secrets versions add DELIVERY_STATUS_CALLBACK_SECRET',
  'timeout --kill-after=5s 45s gcloud secrets versions list TWILIO_AUTH_TOKEN',
  'timeout --kill-after=30s 8m firebase deploy',
  'timeout --kill-after=5s 60s gcloud functions describe',
  'timeout --kill-after=5s 60s gcloud logging read',
  'deadline-bounded so mandatory webhook reconciliation retains a cleanup window',
  'Start bounded SendGrid proof budget',
  'SENDGRID_JOB_START_EPOCH=$(date +%s)',
  'Require reserved provider-mutation and cleanup budget',
  'at least 25 minutes of the 35-minute job budget must remain',
  'Temporary SendGrid webhook reconciliation left',
  'gcloud logging read',
  'verifySendGridStagingCallback',
  'secretMaterialRetained:false',
  'productionDeploymentAuthorized:false',
  'realEmailSendPerformed:false'
];
for (const marker of required) {
  if (!authorityText.includes(marker)) throw new Error(`missing SendGrid staging marker: ${marker}`);
}

const forbidden = [
  [/urai-communications-prod\.cloudfunctions\.net/, 'production callback target'],
  [/urai-communications-prod/, 'production project access'],
  [/firebase deploy[\s\S]*--only hosting/, 'hosting deployment'],
  [/mail\/send/, 'real SendGrid email send'],
  [/ENABLE_REAL_DELIVERY=true/, 'real delivery enablement'],
  [/environment:\s*production/, 'production environment'],
  [/allUsers/, 'public IAM weakening'],
  [/gcloud secrets create/, 'workflow secret-resource creation'],
  [/gcloud secrets add-iam-policy-binding/, 'workflow Secret Manager IAM mutation']
];
for (const [pattern,label] of forbidden) {
  if (pattern.test(text)) throw new Error(`forbidden SendGrid staging marker: ${label}`);
}
const installIndex = text.indexOf('- name: Install exact dependencies and Firebase CLI');
const budgetIndex = text.indexOf('- name: Require reserved provider-mutation and cleanup budget');
const createIndex = text.indexOf('- name: Prove SendGrid webhook capacity and create temporary disabled endpoint');
const deployIndex = text.indexOf('- name: Deploy exact signed callback to staging only');
const cleanupIndex = text.indexOf('- name: Delete and reconcile temporary SendGrid webhook');
if (!(installIndex >= 0 && installIndex < budgetIndex && budgetIndex < createIndex && createIndex < deployIndex && deployIndex < cleanupIndex)) {
  throw new Error('SendGrid staging mutation/cleanup ordering regressed');
}

console.log('Communications main SendGrid signed staging workflow contract OK');

const bootstrapRequired = [
  "PROJECT_ID='urai-staging'",
  "DEPLOY_SERVICE_ACCOUNT='urai-staging-github-deployer@urai-staging.iam.gserviceaccount.com'",
  'CONFIRM_STAGING_SENDGRID_IAM',
  'roles/cloudfunctions.admin',
  'roles/iam.serviceAccountUser',
  'roles/secretmanager.secretVersionAdder',
  'roles/secretmanager.secretAccessor',
  'SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY',
  'DELIVERY_STATUS_CALLBACK_SECRET',
  'TWILIO_AUTH_TOKEN',
  'user_managed_deploy_keys=false',
  'STAGING_SENDGRID_FUNCTION_IAM_OK',
  'urai-staging-functions-runtime@urai-staging.iam.gserviceaccount.com',
  'gcloud iam service-accounts create urai-staging-functions-runtime'
];
for (const marker of bootstrapRequired) {
  if (!bootstrap.includes(marker)) throw new Error(`missing SendGrid IAM bootstrap marker: ${marker}`);
}
for (const marker of ['roles/owner','roles/editor','roles/firebase.admin','roles/secretmanager.admin']) {
  if (!bootstrap.includes(marker)) throw new Error(`missing broad-role rejection marker: ${marker}`);
}
console.log('Communications main SendGrid least-privilege IAM bootstrap contract OK');
const callbackTests = spawnSync(process.execPath, ['--test', 'scripts/test-sendgrid-staging-callback.mjs','scripts/test-staging-verification-binding.mjs'], { stdio: 'inherit' });
if (callbackTests.status !== 0) throw new Error('Run-bound SendGrid callback proof tests failed');

