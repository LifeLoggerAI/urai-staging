import fs from 'node:fs';

const path = '.github/workflows/communications-pr58-twilio-trial-e2e.yml';
const text = fs.readFileSync(path,'utf8');
const sourceRefHelper = fs.readFileSync('scripts/assert-current-communications-source.sh','utf8');
const authorityText = `${text}\n${sourceRefHelper}`;
const required = [
  'name: Communications selected Twilio API-Key Trial Protected Staging E2E',
  'workflow_dispatch:',
  'issue_comment:',
  "github.event.issue.number == 76",
  "github.event.comment.body == 'RUN_TWILIO_PR75_TRIAL_STAGING_E2E'",
  "github.event.comment.author_association == 'OWNER'",
  'github.actor == github.repository_owner',
  'environment: staging',
  'https://api.github.com/repos/LifeLoggerAI/urai-communications/git/ref/heads/$COMMUNICATIONS_BRANCH',
  'verify-staging-verification-binding.mjs',
  "STAGING_REVIEW_PR_NUMBER: '109'",
  'LifeLoggerAI/urai-communications',
  'functions:adminTwilioTestSend,functions:adminProviderReadiness,functions:adminDeliveryProof,functions:twilioDeliveryStatusCallback',
  'ENABLE_WEBHOOK_TEST_MODE=false',
  'STAGING_SMS_SEND_FUNCTION=adminTwilioTestSend',
  'STAGING_TWILIO_CALLBACK_FUNCTION=twilioDeliveryStatusCallback',
  'ENABLE_REAL_DELIVERY=true',
  'ENABLE_TWILIO_SMS=true',
  'TWILIO_TRIAL_MODE=true',
  'TWILIO_FROM_NUMBER: ${{ secrets.TWILIO_FROM_NUMBER }}',
  'node scripts/verify-twilio-trial-sender.mjs',
  'TWILIO_FROM_NUMBER=$TWILIO_FROM_NUMBER',
  'URAI_CROSS_REPO_READ_TOKEN',
  'URAI_CROSS_REPO_READ_SSH_KEY',
  'git ls-remote git@github.com:LifeLoggerAI/urai-communications.git "refs/heads/$COMMUNICATIONS_BRANCH"',
  'ssh-key: ${{ secrets.URAI_CROSS_REPO_READ_SSH_KEY }}',
  'GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT',
  'RUNTIME_SERVICE_ACCOUNT',
  'token: ${{ secrets.URAI_CROSS_REPO_READ_TOKEN }}',
  "if: env.CROSS_REPO_AUTH_MODE == 'token'",
  "if: env.CROSS_REPO_AUTH_MODE == 'ssh'",
  "senderMode:'explicit-owned-trial-number'",
  "senderRef:h(process.env.TWILIO_FROM_NUMBER)",
  'STAGING_TEST_SMS_BODY: sms_appointment_reminders',
  'gcloud secrets versions add TWILIO_AUTH_TOKEN',
  'gcloud secrets versions add TWILIO_ACCOUNT_SID',
  'gcloud secrets versions add TWILIO_API_KEY_SID',
  'gcloud secrets versions add TWILIO_API_KEY_SECRET',
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
for (const marker of required) if (!authorityText.includes(marker)) throw new Error(`missing Communications Twilio staging marker: ${marker}`);

const communicationsInputBlock = text.match(/communications_sha:\n([\s\S]*?)\n\s*expected_controller_sha:/)?.[1] ?? '';
if (!communicationsInputBlock.includes('required: true')) throw new Error('communications_sha must remain a required workflow_dispatch input');
if (/\bdefault\s*:/.test(communicationsInputBlock)) throw new Error('communications_sha must not carry a stale workflow_dispatch default; exact authority must be supplied explicitly');
if (!text.includes("EXPECTED_COMMUNICATIONS_SHA: ${{ github.event_name == 'workflow_dispatch' && inputs.communications_sha || '759f664cdf00a48272f5401b7cfc45bbd8afb537' }}")) throw new Error('owner-trigger path must remain pinned to current canonical Communications authority');
if (!text.includes("CONTROLLER_SHA: ${{ github.event_name == 'workflow_dispatch' && inputs.expected_controller_sha || github.sha }}")) throw new Error('controller SHA must bind to the actual executing source');
const gateIndex=text.indexOf('node scripts/verify-staging-verification-binding.mjs');
if (!(gateIndex > 0 && gateIndex < text.indexOf('- name: Authenticate WIF'))) throw new Error('Twilio native exact-head review must precede WIF/provider mutation');
if (!text.includes('vars.GCP_STAGING_FUNCTIONS_RUNTIME_SERVICE_ACCOUNT')) throw new Error('Twilio controller must bind the provider-read runtime service account variable');
if (!text.includes('test "$RUNTIME_SERVICE_ACCOUNT" != "$DEPLOY_SERVICE_ACCOUNT"')) throw new Error('Twilio controller must keep runtime and deploy service accounts distinct');

const senderReadIndex = text.indexOf('node scripts/verify-twilio-trial-sender.mjs');
if (!(senderReadIndex > gateIndex && senderReadIndex < text.indexOf('- name: Authenticate WIF'))) throw new Error('owned trial sender must be read-verified after native review and before deployment mutation');
if ((text.match(/TWILIO_FROM_NUMBER=\$TWILIO_FROM_NUMBER/g) || []).length !== 2) throw new Error('owned trial sender must bind both proof-window and disabled rollback environment');

const forbidden = [
  [/TWILIO_FROM_NUMBER: ''|senderMode:'provider-assigned-trial-number'/, 'implicit trial sender'],
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
console.log('Communications main Twilio staging workflow contract OK');

