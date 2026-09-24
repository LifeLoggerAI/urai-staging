import fs from 'node:fs';

const path = new URL('../config/staging-consumers.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const failures = [];
const expectedCommunicationsSha = 'f4930e0b67b900cc2ae3fc931da5f53668f4dc96';

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

const communications = doc.consumers?.find((entry) => entry.id === 'urai-communications-pr53-twilio-trial-e2e') || {};
if (communications.repository !== 'LifeLoggerAI/urai-communications') failures.push('communications repository');
if (communications.repositoryId !== 1169785707) failures.push('communications repositoryId');
if (communications.pullRequest !== 53) failures.push('communications pullRequest');
if (communications.exactSha !== expectedCommunicationsSha) failures.push('communications exactSha');
if (communications.sourceRef !== 'refs/pull/53/head') failures.push('communications sourceRef');
if (communications.mode !== 'twilio-trial-protected-staging-e2e') failures.push('communications mode');
if (communications.dataPolicy !== 'synthetic-only') failures.push('communications dataPolicy');
if (communications.providerProject !== 'urai-staging') failures.push('communications providerProject');
if (communications.allowedEnvironment !== 'staging') failures.push('communications allowedEnvironment');
if (JSON.stringify(communications.allowedDeployScopes) !== JSON.stringify(['functions-explicit-only'])) failures.push('communications allowedDeployScopes');
if (JSON.stringify(communications.initialFunctionDeploymentAllowlist) !== JSON.stringify(['adminTwilioTestSend','adminProviderReadiness','adminDeliveryProof','twilioDeliveryStatusCallback'])) failures.push('communications function allowlist');
if (JSON.stringify(communications.secretWriteAllowlist) !== JSON.stringify(['TWILIO_AUTH_TOKEN'])) failures.push('communications secret allowlist');
if (communications.providerMutationAuthorized !== true) failures.push('communications provider mutation');
if (communications.providerMutationScope !== 'single-verified-trial-recipient-only') failures.push('communications provider mutation scope');
if (communications.hostingMutationAuthorized !== false) failures.push('communications hosting mutation');
if (communications.projectWideRuleMutationAuthorized !== false) failures.push('communications project-wide rules');
if (communications.productionDeploymentAuthorized !== false) failures.push('communications production deployment');
if (communications.productionDataAuthorized !== false) failures.push('communications production data');
if (communications.longLivedCredentialsAuthorized !== false) failures.push('communications long-lived credentials');
if (communications.twilioTrialModeOnly !== true) failures.push('communications Twilio trial mode');
if (communications.twilioProductionMessagingAuthorized !== false) failures.push('communications production Twilio');
if (communications.rollbackToDeliveryDisabledRequired !== true) failures.push('communications rollback requirement');

if (failures.length) {
  console.error(`staging consumer authority invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging consumer authority contract OK');
