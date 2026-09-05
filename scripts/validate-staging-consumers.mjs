import fs from 'node:fs';

const path = new URL('../config/staging-consumers.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const failures = [];

if (doc.schemaVersion !== 'urai-staging-consumers-1') failures.push('schemaVersion');
if (doc.projectId !== 'urai-staging') failures.push('projectId');
if (doc.environment !== 'staging') failures.push('environment');
if (doc.mutationAuthorityRepository !== 'LifeLoggerAI/urai-staging') failures.push('mutationAuthorityRepository');
if (doc.productionAllowed !== false) failures.push('productionAllowed');
if (!Array.isArray(doc.consumers) || doc.consumers.length !== 2) failures.push('consumers');

const admin = doc.consumers?.find((entry) => entry.id === 'urai-admin-pr57-runtime-closure') || {};
if (admin.repository !== 'LifeLoggerAI/urai-admin') failures.push('admin repository');
if (admin.repositoryId !== 1150887043) failures.push('admin repositoryId');
if (admin.pullRequest !== 57) failures.push('admin pullRequest');
if (admin.exactSha !== 'fb255310d6b183a59e4252da80c685f45e5cf536') failures.push('admin exactSha');
if (admin.sourceRef !== 'refs/pull/57/head') failures.push('admin sourceRef');
if (admin.mode !== 'synthetic-runtime-validation') failures.push('admin mode');
if (admin.providerProject !== 'urai-staging') failures.push('admin providerProject');
if (admin.allowedEnvironment !== 'staging') failures.push('admin allowedEnvironment');
if (admin.dataPolicy !== 'synthetic-only') failures.push('admin dataPolicy');
if (JSON.stringify(admin.initialFunctionDeploymentAllowlist) !== JSON.stringify(['nextServer'])) failures.push('admin initialFunctionDeploymentAllowlist');
if (admin.scheduledAnalyticsDeploymentAuthorized !== false) failures.push('admin scheduledAnalyticsDeploymentAuthorized');
if (admin.hostingLiveChannelMutationAuthorized !== false) failures.push('admin hostingLiveChannelMutationAuthorized');
if (admin.productionDeploymentAuthorized !== false) failures.push('admin productionDeploymentAuthorized');
if (admin.productionDataAuthorized !== false) failures.push('admin productionDataAuthorized');
if (admin.longLivedCredentialsAuthorized !== false) failures.push('admin longLivedCredentialsAuthorized');
if (admin.projectWideRuleMutationAuthorized !== false) failures.push('admin projectWideRuleMutationAuthorized');
const adminScopes = new Set(admin.allowedDeployScopes || []);
for (const scope of ['functions-explicit-only', 'hosting-preview-only']) if (!adminScopes.has(scope)) failures.push(`admin missing ${scope}`);
for (const forbidden of ['firestore', 'storage', 'production', 'generic-source', 'hosting-live']) if (adminScopes.has(forbidden)) failures.push(`admin forbidden ${forbidden}`);

const spatial = doc.consumers?.find((entry) => entry.id === 'urai-spatial-pr1182-stripe-test-e2e') || {};
if (spatial.repository !== 'LifeLoggerAI/urai-spatial') failures.push('spatial repository');
if (spatial.repositoryId !== 1167675641) failures.push('spatial repositoryId');
if (spatial.pullRequest !== 1182) failures.push('spatial pullRequest');
if (spatial.exactSha !== 'a79a0e7bd152bb4e04687c368a585eac00add402') failures.push('spatial exactSha');
if (spatial.sourceRef !== 'refs/pull/1182/head') failures.push('spatial sourceRef');
if (spatial.mode !== 'stripe-test-provider-readiness') failures.push('spatial mode');
if (spatial.dataPolicy !== 'synthetic-only') failures.push('spatial dataPolicy');
if (spatial.providerProject !== 'urai-staging') failures.push('spatial providerProject');
if (spatial.allowedEnvironment !== 'staging') failures.push('spatial allowedEnvironment');
if (!Array.isArray(spatial.allowedDeployScopes) || spatial.allowedDeployScopes.length !== 0) failures.push('spatial allowedDeployScopes');
if (spatial.providerReadOnlyAuthorized !== true) failures.push('spatial providerReadOnlyAuthorized');
if (spatial.appHostingRolloutAuthorized !== false) failures.push('spatial appHostingRolloutAuthorized');
if (spatial.hostingPreviewMutationAuthorized !== false) failures.push('spatial hostingPreviewMutationAuthorized');
if (spatial.projectWideRuleMutationAuthorized !== false) failures.push('spatial projectWideRuleMutationAuthorized');
if (spatial.productionDeploymentAuthorized !== false) failures.push('spatial productionDeploymentAuthorized');
if (spatial.productionDataAuthorized !== false) failures.push('spatial productionDataAuthorized');
if (spatial.longLivedCredentialsAuthorized !== false) failures.push('spatial longLivedCredentialsAuthorized');
if (spatial.stripeTestModeOnly !== true) failures.push('spatial stripeTestModeOnly');
if (spatial.stripeLiveModeAuthorized !== false) failures.push('spatial stripeLiveModeAuthorized');

if (failures.length) {
  console.error(`staging consumer authority invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging consumer authority contract OK');
