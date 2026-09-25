import fs from 'node:fs';

const guardPath = 'scripts/assert-staging-billing-enabled.sh';
const twilioPath = '.github/workflows/communications-pr53-twilio-trial-e2e.yml';
const deployPath = '.github/workflows/staging-deploy.yml';

const guard = fs.readFileSync(guardPath, 'utf8');
const twilio = fs.readFileSync(twilioPath, 'utf8');
const deploy = fs.readFileSync(deployPath, 'utf8');
const failures = [];

for (const required of [
  "PROJECT_ID='urai-staging'",
  'gcloud billing projects describe "$PROJECT_ID" --format=json',
  'info.billingEnabled !== true',
  'billing_account_association=present'
]) {
  if (!guard.includes(required)) failures.push(`billing guard missing: ${required}`);
}

for (const forbidden of [
  'billing projects link',
  'billing projects unlink',
  'billing projects update',
  'billing accounts close',
  'add-iam-policy-binding'
]) {
  if (guard.includes(forbidden)) failures.push(`billing guard must be read-only: ${forbidden}`);
}

const call = 'bash scripts/assert-staging-billing-enabled.sh';
if (!twilio.includes(call)) failures.push('Twilio controller missing billing guard');
if (!deploy.includes(call)) failures.push('Staging deploy missing billing guard');

const twilioAuth = twilio.indexOf('Authenticate WIF to urai-staging');
const twilioGuard = twilio.indexOf('Require billing-enabled staging project');
const twilioMutation = twilio.indexOf('Version only pre-created staging Twilio secrets');
if (!(twilioAuth >= 0 && twilioGuard > twilioAuth && twilioMutation > twilioGuard)) {
  failures.push('Twilio billing guard order');
}

const deployAuth = deploy.indexOf('Authenticate to Google Cloud with WIF');
const deployGuard = deploy.indexOf('Require billing-enabled staging project');
const deployMutation = deploy.indexOf('Deploy verified artifact to staging only');
if (!(deployAuth >= 0 && deployGuard > deployAuth && deployMutation > deployGuard)) {
  failures.push('Staging deploy billing guard order');
}

if (failures.length) {
  console.error(`staging billing contract invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging billing contract OK');
