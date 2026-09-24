import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/private-consumer-ref-verification.yml','utf8');
const required = [
  'name: Protected Private Consumer Ref Verification',
  'environment: staging',
  'URAI_CROSS_REPO_READ_TOKEN',
  'config/staging-consumers.json',
  'api.github.com/repos/',
  '/pulls/',
  'protected-github-api',
  'productionMutationPerformed: false',
  'providerMutationPerformed: false',
  'Upload sanitized private consumer ref evidence',
];
for (const marker of required) {
  if (!workflow.includes(marker)) throw new Error(`missing private consumer ref verification marker: ${marker}`);
}
for (const forbidden of ['firebase deploy','gcloud functions deploy','gcloud run deploy','TWILIO_AUTH_TOKEN','STRIPE_SECRET_KEY','urai-4dc1d']) {
  if (workflow.includes(forbidden)) throw new Error(`forbidden private consumer ref verification marker: ${forbidden}`);
}
console.log('protected private consumer ref verification workflow contract OK');
