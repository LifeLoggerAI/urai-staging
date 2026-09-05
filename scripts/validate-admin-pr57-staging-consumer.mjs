import fs from 'node:fs';

const text = fs.readFileSync('.github/workflows/admin-pr57-staging-consumer.yml', 'utf8');
const required = [
  'name: Admin PR57 Staging Consumer',
  'environment: staging',
  'ADMIN_REPOSITORY: LifeLoggerAI/urai-admin',
  'STAGING_PROJECT_ID: urai-staging',
  "URAI_PRODUCTION_DEPLOY_APPROVED: '0'",
  'node scripts/validate-staging-consumers.mjs',
  'refs/pull/57/head',
  'functions-explicit-only',
  'hosting-preview-only',
  'projectWideRuleMutationAuthorized: false',
  'productionDeploymentAuthorized: false',
  'productionDataAuthorized: false',
  'longLivedCredentialsAuthorized: false',
  'nextServer',
  'aggregateAnalytics',
  'aggregateUraiAnalyticsV1',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ vars.GCP_STAGING_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'provider read-only IAM probe is green',
  'exit 78',
  'test -z "${FIREBASE_TOKEN:-}"',
  'test -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}"',
];
for (const marker of required) {
  if (!text.includes(marker)) throw new Error(`missing Admin staging consumer workflow marker: ${marker}`);
}

const forbiddenPatterns = [
  [/^\s*FIREBASE_TOKEN\s*:/m, 'FIREBASE_TOKEN YAML key'],
  [/^\s*FIREBASE_SERVICE_ACCOUNT_KEY\s*:/m, 'service-account key YAML key'],
  [/^\s*credentials_json\s*:/m, 'credentials_json input'],
  [/--project\s+urai-4dc1d/, 'production project CLI target'],
  [/-P\s+urai-4dc1d/, 'production Firebase project target'],
  [/^\s*environment:\s*production\s*$/m, 'production environment'],
  [/firebase deploy --only firestore/, 'project-wide Firestore deploy'],
  [/firebase deploy --only storage/, 'project-wide Storage deploy'],
  [/firebase deploy --only hosting,functions,firestore,storage/, 'project-wide full deploy'],
];
for (const [pattern, label] of forbiddenPatterns) {
  if (pattern.test(text)) throw new Error(`forbidden Admin staging consumer workflow marker: ${label}`);
}
console.log('Admin PR57 staging consumer workflow contract OK');
