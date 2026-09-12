import fs from 'node:fs';

const workflowPath = '.github/workflows/spatial-pr1182-stripe-provider-probe.yml';
const text = fs.readFileSync(workflowPath, 'utf8');

const required = [
  'name: Spatial PR1182 Stripe TEST Provider Probe',
  'environment: staging',
  'SPATIAL_REPOSITORY: LifeLoggerAI/urai-spatial',
  "SPATIAL_PR_NUMBER: '1182'",
  'STAGING_PROJECT_ID: urai-staging',
  "URAI_STRIPE_TEST_ONLY: '1'",
  'refs/pull/1182/head',
  'urai-spatial-pr1182-stripe-test-e2e',
  'providerReadOnlyAuthorized',
  'appHostingRolloutAuthorized',
  'stripeTestModeOnly',
  'stripeLiveModeAuthorized',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ vars.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'firebase apphosting:backends:list',
  'firebase hosting:sites:list',
  'gcloud run services list',
  'gcloud functions list',
  'test -z "${FIREBASE_TOKEN:-}"',
  'test -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}"',
  'providerMutationPerformed: false',
  'productionDeploymentPerformed: false',
  '$RUNNER_TEMP/urai-spatial-pr1182-provider-read-raw',
  'evidenceSanitizedBeforeRetention: true',
  'Upload sanitized read-only provider evidence',
  'if: ${{ success() }}',
];
for (const marker of required) {
  if (!text.includes(marker)) throw new Error(`missing Spatial PR1182 provider-probe marker: ${marker}`);
}

const forbiddenPatterns = [
  [/apphosting:backends:create/, 'App Hosting backend creation'],
  [/apphosting:rollouts:create/, 'App Hosting rollout mutation'],
  [/hosting:channel:deploy/, 'Hosting preview mutation'],
  [/firebase\s+deploy/, 'Firebase deploy mutation'],
  [/gcloud\s+run\s+deploy/, 'Cloud Run deploy mutation'],
  [/gcloud\s+functions\s+deploy/, 'Cloud Functions deploy mutation'],
  [/apphosting:secrets:set/, 'App Hosting secret mutation'],
  [/gcloud\s+secrets\s+versions\s+access/, 'secret value access'],
  [/\bsecrets\s*\.\s*STRIPE_SECRET_KEY\b/i, 'direct Stripe secret key GitHub secret-context reference'],
  [/\bsecrets\s*\.\s*STRIPE_WEBHOOK_SECRET\b/i, 'direct Stripe webhook secret GitHub secret-context reference'],
  [/^\s*["']?STRIPE_SECRET_KEY["']?\s*:/m, 'Stripe secret key YAML binding'],
  [/^\s*["']?STRIPE_WEBHOOK_SECRET["']?\s*:/m, 'Stripe webhook secret YAML binding'],
  [/\bSTRIPE_SECRET_KEY\s*=\s*[^)]/m, 'Stripe secret key shell assignment'],
  [/\bSTRIPE_WEBHOOK_SECRET\s*=\s*[^)]/m, 'Stripe webhook secret shell assignment'],
  [/urai-4dc1d/, 'production project target'],
  [/^\s*environment:\s*production\s*$/m, 'production environment'],
];
for (const [pattern, label] of forbiddenPatterns) {
  if (pattern.test(text)) throw new Error(`forbidden Spatial PR1182 provider-probe marker: ${label}`);
}

console.log('Spatial PR1182 Stripe TEST provider-probe workflow contract OK');