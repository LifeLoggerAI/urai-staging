import fs from 'node:fs';

const workflowPath = '.github/workflows/communications-pr58-sendgrid-staging-e2e.yml';
const bootstrapPath = 'scripts/bootstrap-staging-sendgrid-proof-iam.sh';
const text = fs.readFileSync(workflowPath, 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const required = [
  'name: Communications main SendGrid Signed Protected Staging E2E',
  'workflow_dispatch:',
  'environment: staging',
  'LifeLoggerAI/urai-communications',
  '759f664cdf00a48272f5401b7cfc45bbd8afb537',
  'SENDGRID_API_KEY',
  'URAI_CROSS_REPO_READ_TOKEN',
  'URAI_CROSS_REPO_READ_SSH_KEY',
  'git ls-remote git@github.com:LifeLoggerAI/urai-communications.git refs/heads/main',
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
  'gcloud logging read',
  'secretMaterialRetained:false',
  'productionDeploymentAuthorized:false',
  'realEmailSendPerformed:false'
];
for (const marker of required) {
  if (!text.includes(marker)) throw new Error(`missing SendGrid staging marker: ${marker}`);
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
