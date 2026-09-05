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
];
for (const marker of required) {
  if (!text.includes(marker)) throw new Error(`missing Admin staging consumer workflow marker: ${marker}`);
}
for (const forbidden of [
  'FIREBASE_TOKEN:',
  'credentials_json:',
  'service_account_key',
  '--project urai-4dc1d',
  '-P urai-4dc1d',
  'environment: production',
  'firebase deploy --only firestore',
  'firebase deploy --only storage',
  'firebase deploy --only hosting,functions,firestore,storage',
]) {
  if (text.includes(forbidden)) throw new Error(`forbidden Admin staging consumer workflow marker: ${forbidden}`);
}
console.log('Admin PR57 staging consumer workflow contract OK');
