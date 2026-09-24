import fs from 'node:fs';

const path = '.github/workflows/communications-pr53-twilio-trial-e2e.yml';
const text = fs.readFileSync(path,'utf8');
const required = [
  'name: Communications PR53 Twilio Trial Protected Staging E2E',
  'workflow_dispatch:',
  'environment: staging',
  'refs/pull/53/head',
  'LifeLoggerAI/urai-communications',
  'functions:adminTwilioTestSend,functions:adminProviderReadiness,functions:adminDeliveryProof,functions:twilioDeliveryStatusCallback',
  'ENABLE_WEBHOOK_TEST_MODE=false',
  'STAGING_SMS_SEND_FUNCTION=adminTwilioTestSend',
  'STAGING_TWILIO_CALLBACK_FUNCTION=twilioDeliveryStatusCallback',
  'ENABLE_REAL_DELIVERY=true',
  'ENABLE_TWILIO_SMS=true',
  'TWILIO_TRIAL_MODE=true',
  'STAGING_TEST_SMS_BODY: sms_appointment_reminders',
  'gcloud secrets versions add TWILIO_AUTH_TOKEN',
  'npm run verify:staging:delivery -- --staging --sms --callback',
  'ENABLE_REAL_DELIVERY=false',
  'ENABLE_TWILIO_SMS=false',
  'Upload sanitized retained proof',
  'if: ${{ success() }}',
  'productionMessagingAuthorized:false',
  'secretMaterialRetained:false',
  'communications-source/functions/.env.urai-staging'
];
for (const marker of required) if (!text.includes(marker)) throw new Error(`missing Communications Twilio staging marker: ${marker}`);

const forbidden = [
  [/urai-4dc1d/, 'production project'],
  [/environment:\s*production/, 'production environment'],
  [/hosting:deploy|hosting:channel:deploy|apphosting:rollouts:create/, 'hosting mutation'],
  [/firestore:rules|firestore:indexes|storage/, 'project-wide data-plane mutation'],
  [/TWILIO_MESSAGING_SERVICE_SID=.*MG/, 'production Messaging Service binding'],
  [/sk_live_|rk_live_/, 'live billing credential'],
];
for (const [pattern,label] of forbidden) if (pattern.test(text)) throw new Error(`forbidden Communications Twilio staging marker: ${label}`);
const uploadStep = text.slice(text.indexOf('- name: Upload sanitized retained proof'));
if (!uploadStep.startsWith('- name: Upload sanitized retained proof')) throw new Error('sanitized proof upload step missing');
if (!uploadStep.includes('if: ${{ success() }}')) throw new Error('sanitized proof upload must be success-gated');
if (/if:\s*always\(\)/.test(uploadStep.split(/\n\s*- name:/, 1)[0])) throw new Error('sanitized proof upload cannot run on failure');
console.log('Communications PR53 Twilio staging workflow contract OK');
