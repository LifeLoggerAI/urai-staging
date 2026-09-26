import fs from 'node:fs';

const path = '.github/workflows/communications-pr58-twilio-trial-e2e.yml';
const text = fs.readFileSync(path,'utf8');
const required = [
  'name: Communications PR58 Twilio Trial Protected Staging E2E',
  'workflow_dispatch:',
  'environment: staging',
  'https://api.github.com/repos/LifeLoggerAI/urai-communications/pulls/58',
  'LifeLoggerAI/urai-communications',
  'functions:adminTwilioTestSend,functions:adminProviderReadiness,functions:adminDeliveryProof,functions:twilioDeliveryStatusCallback',
  'ENABLE_WEBHOOK_TEST_MODE=false',
  'STAGING_SMS_SEND_FUNCTION=adminTwilioTestSend',
  'STAGING_TWILIO_CALLBACK_FUNCTION=twilioDeliveryStatusCallback',
  'ENABLE_REAL_DELIVERY=true',
  'ENABLE_TWILIO_SMS=true',
  'TWILIO_TRIAL_MODE=true',
  "TWILIO_FROM_NUMBER: ''",
  'URAI_CROSS_REPO_READ_TOKEN',
  'GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT',
  'RUNTIME_SERVICE_ACCOUNT',
  'token: ${{ secrets.URAI_CROSS_REPO_READ_TOKEN }}',
  "senderMode:'provider-assigned-trial-number'",
  'STAGING_TEST_SMS_BODY: sms_appointment_reminders',
  'gcloud secrets versions add TWILIO_AUTH_TOKEN',
  'npm run verify:staging:delivery -- --staging --sms --callback',
  'ENABLE_REAL_DELIVERY=false',
  'ENABLE_TWILIO_SMS=false',
  'Upload sanitized retained proof',
  'if: ${{ success() }}',
  'productionMessagingAuthorized:false',
  'secretMaterialRetained:false',
  'communications-source/functions/.env.urai-staging',
  'TWILIO_PROOF_WINDOW_DEPLOY_STARTED=true',
  "if: ${{ always() && env.TWILIO_PROOF_WINDOW_DEPLOY_STARTED == 'true' }}"
];
for (const marker of required) if (!text.includes(marker)) throw new Error(`missing Communications Twilio staging marker: ${marker}`);

const communicationsInputBlock = text.match(/communications_sha:\n([\s\S]*?)\n\s*expected_controller_sha:/)?.[1] ?? '';
if (!communicationsInputBlock.includes('required: true')) throw new Error('communications_sha must remain a required workflow_dispatch input');
if (/\bdefault\s*:/.test(communicationsInputBlock)) throw new Error('communications_sha must not carry a stale default; exact authority must be supplied explicitly');
if (!text.includes('vars.GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT')) throw new Error('Twilio controller must bind the provider-read runtime service account variable');
if (!text.includes('test "$RUNTIME_SERVICE_ACCOUNT" != "$DEPLOY_SERVICE_ACCOUNT"')) throw new Error('Twilio controller must keep runtime and deploy service accounts distinct');

const forbidden = [
  [/urai-4dc1d/, 'production project'],
  [/environment:\s*production/, 'production environment'],
  [/hosting:deploy|hosting:channel:deploy|apphosting:rollouts:create/, 'hosting mutation'],
  [/firestore:rules|firestore:indexes|storage/, 'project-wide data-plane mutation'],
  [/TWILIO_MESSAGING_SERVICE_SID=.*MG/, 'production Messaging Service binding'],
  [/sk_live_|rk_live_/, 'live billing credential'],
];
for (const [pattern,label] of forbidden) if (pattern.test(text)) throw new Error(`forbidden Communications Twilio staging marker: ${label}`);
const rollbackStep = text.slice(text.indexOf('- name: Roll back runtime delivery flags to OFF'));
if (!rollbackStep.startsWith('- name: Roll back runtime delivery flags to OFF')) throw new Error('rollback step missing');
if (!rollbackStep.includes("if: ${{ always() && env.TWILIO_PROOF_WINDOW_DEPLOY_STARTED == 'true' }}")) throw new Error('rollback must run only after a proof-window deploy attempt began');

const uploadStep = text.slice(text.indexOf('- name: Upload sanitized retained proof'));
if (!uploadStep.startsWith('- name: Upload sanitized retained proof')) throw new Error('sanitized proof upload step missing');
if (!uploadStep.includes('if: ${{ success() }}')) throw new Error('sanitized proof upload must be success-gated');
if (/if:\s*always\(\)/.test(uploadStep.split(/\n\s*- name:/, 1)[0])) throw new Error('sanitized proof upload cannot run on failure');
console.log('Communications PR58 Twilio staging workflow contract OK');
