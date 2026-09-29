import fs from 'node:fs';

const workflowPath = '.github/workflows/communications-pr58-sendgrid-staging-e2e.yml';
const text = fs.readFileSync(workflowPath, 'utf8');
const required = [
  'name: Communications PR58 SendGrid Signed Protected Staging E2E',
  'pull_request:',
  'environment: staging',
  'LifeLoggerAI/urai-communications',
  'ad43d9aae6e5f2d3f59fb8459402a179840e1cfc',
  'SENDGRID_API_KEY',
  'SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY',
  'DELIVERY_STATUS_CALLBACK_SECRET',
  'functions:deliveryStatusCallback',
  'https://api.sendgrid.com/v3/user/webhooks/event/settings',
  'https://api.sendgrid.com/v3/user/webhooks/event/settings/signed/',
  'https://api.sendgrid.com/v3/user/webhooks/event/test',
  'DELETE',
  'UrAi Staging Signed Proof',
  'gcloud logging read',
  'invalid_callback_signature',
  'secretMaterialRetained:false',
  'productionDeploymentAuthorized:false',
  'realEmailSendPerformed:false'
];
for (const marker of required) {
  if (!text.includes(marker)) throw new Error(`missing SendGrid staging marker: ${marker}`);
}

const forbidden = [
  [/urai-communications-prod\.cloudfunctions\.net/, 'production callback target'],
  [/--project\s+urai-communications-prod\b/, 'production deployment project'],
  [/firebase deploy[\s\S]*--only hosting/, 'hosting deployment'],
  [/mail\/send/, 'real SendGrid email send'],
  [/ENABLE_REAL_DELIVERY=true/, 'real delivery enablement'],
  [/environment:\s*production/, 'production environment'],
  [/allUsers/, 'public IAM weakening']
];
for (const [pattern,label] of forbidden) {
  if (pattern.test(text)) throw new Error(`forbidden SendGrid staging marker: ${label}`);
}
console.log('Communications PR58 SendGrid signed staging workflow contract OK');
