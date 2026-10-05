import fs from 'node:fs';

const path = new URL('../config/staging-consumers.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const failures = [];

if (doc.schemaVersion !== 'urai-staging-consumers-2') failures.push('schemaVersion');
if (doc.projectId !== 'urai-staging') failures.push('projectId');
if (doc.environment !== 'staging') failures.push('environment');
if (doc.mutationAuthorityRepository !== 'LifeLoggerAI/urai-staging') failures.push('mutationAuthorityRepository');
if (doc.productionAllowed !== false) failures.push('productionAllowed');
if (!Array.isArray(doc.consumers) || doc.consumers.length !== 3) failures.push('active consumers');
if (!Array.isArray(doc.historicalConsumers) || doc.historicalConsumers.length !== 3) failures.push('historical consumers');

for (const c of doc.consumers || []) {
  if (c.state !== 'active') failures.push(`${c.id || 'consumer'} state`);
  if (!/^[0-9a-f]{40}$/.test(c.exactSha || '')) failures.push(`${c.id || 'consumer'} exactSha`);
  if (!/^refs\//.test(c.sourceRef || '')) failures.push(`${c.id || 'consumer'} sourceRef`);
  if (c.providerProject !== 'urai-staging') failures.push(`${c.id || 'consumer'} providerProject`);
  if (c.allowedEnvironment !== 'staging') failures.push(`${c.id || 'consumer'} allowedEnvironment`);
  if (c.dataPolicy !== 'synthetic-only') failures.push(`${c.id || 'consumer'} dataPolicy`);
  if (c.productionDeploymentAuthorized !== false) failures.push(`${c.id || 'consumer'} productionDeploymentAuthorized`);
  if (c.productionDataAuthorized !== false) failures.push(`${c.id || 'consumer'} productionDataAuthorized`);
  if (c.longLivedCredentialsAuthorized !== false) failures.push(`${c.id || 'consumer'} longLivedCredentialsAuthorized`);
  if (c.projectWideRuleMutationAuthorized !== false) failures.push(`${c.id || 'consumer'} projectWideRuleMutationAuthorized`);
  if (!c.refVerification || !['public-git-ls-remote','protected-github-api','protected-github-api-or-readonly-deploy-key'].includes(c.refVerification.mode)) failures.push(`${c.id || 'consumer'} refVerification`);
}

const spatial = doc.consumers?.find((entry) => entry.id === 'urai-spatial-pr1598-stripe-test-readiness') || {};
if (spatial.repository !== 'LifeLoggerAI/urai-spatial') failures.push('spatial repository');
if (spatial.repositoryId !== 1167675641) failures.push('spatial repositoryId');
if (spatial.pullRequest !== 1598) failures.push('spatial pullRequest');
if (spatial.sourceRef !== 'refs/pull/1598/head') failures.push('spatial sourceRef');
if (spatial.exactSha !== 'b620614593ffd499d7561760d7b34e079034305b') failures.push('spatial exactSha');
if (spatial.mode !== 'stripe-test-provider-readiness') failures.push('spatial mode');
if (!Array.isArray(spatial.allowedDeployScopes) || spatial.allowedDeployScopes.length !== 0) failures.push('spatial allowedDeployScopes');
if (spatial.providerReadOnlyAuthorized !== true) failures.push('spatial providerReadOnlyAuthorized');
if (spatial.appHostingRolloutAuthorized !== false) failures.push('spatial appHostingRolloutAuthorized');
if (spatial.hostingPreviewMutationAuthorized !== false) failures.push('spatial hostingPreviewMutationAuthorized');
if (spatial.stripeTestModeOnly !== true) failures.push('spatial stripeTestModeOnly');
if (spatial.stripeLiveModeAuthorized !== false) failures.push('spatial stripeLiveModeAuthorized');
if (spatial.refVerification?.mode !== 'public-git-ls-remote') failures.push('spatial ref verification');

const communications = doc.consumers?.find((entry) => entry.id === 'urai-communications-main-twilio-trial-e2e') || {};
if (communications.repository !== 'LifeLoggerAI/urai-communications') failures.push('communications repository');
if (communications.repositoryId !== 1169785707) failures.push('communications repositoryId');
if (communications.sourceBranch !== 'main') failures.push('communications sourceBranch');
if (communications.sourceRef !== 'refs/heads/main') failures.push('communications sourceRef');
if (communications.exactSha !== 'dfb8df01fa2c6c2c67db80b78f7b42f7577930b7') failures.push('communications exactSha');
if (communications.mode !== 'twilio-trial-protected-staging-e2e') failures.push('communications mode');
if (JSON.stringify(communications.allowedDeployScopes) !== JSON.stringify(['functions-explicit-only'])) failures.push('communications allowedDeployScopes');
if (JSON.stringify(communications.initialFunctionDeploymentAllowlist) !== JSON.stringify(['adminTwilioTestSend','adminProviderReadiness','adminDeliveryProof','twilioDeliveryStatusCallback'])) failures.push('communications function allowlist');
if (JSON.stringify(communications.secretWriteAllowlist) !== JSON.stringify(['TWILIO_AUTH_TOKEN','TWILIO_ACCOUNT_SID','TWILIO_API_KEY_SID','TWILIO_API_KEY_SECRET'])) failures.push('communications secret allowlist');
if (communications.providerMutationAuthorized !== true) failures.push('communications provider mutation');
if (communications.providerMutationScope !== 'single-verified-trial-recipient-only') failures.push('communications provider mutation scope');
if (communications.hostingMutationAuthorized !== false) failures.push('communications hosting mutation');
if (communications.twilioTrialModeOnly !== true) failures.push('communications Twilio trial mode');
if (communications.twilioProductionMessagingAuthorized !== false) failures.push('communications production Twilio');
if (communications.rollbackToDeliveryDisabledRequired !== true) failures.push('communications rollback requirement');
if (communications.refVerification?.mode !== 'protected-github-api-or-readonly-deploy-key') failures.push('communications ref verification');
if (communications.refVerification?.environment !== 'staging') failures.push('communications ref verification environment');
if (JSON.stringify(communications.refVerification?.allowedSecrets) !== JSON.stringify(['URAI_CROSS_REPO_READ_TOKEN','URAI_CROSS_REPO_READ_SSH_KEY'])) failures.push('communications ref verification secret contract');
if (communications.trialSenderMode !== 'provider-assigned') failures.push('communications trial sender mode');

const sendgrid = doc.consumers?.find((entry) => entry.id === 'urai-communications-main-sendgrid-signed-staging-e2e') || {};
if (sendgrid.repository !== 'LifeLoggerAI/urai-communications') failures.push('sendgrid repository');
if (sendgrid.repositoryId !== 1169785707) failures.push('sendgrid repositoryId');
if (sendgrid.sourceBranch !== 'main') failures.push('sendgrid sourceBranch');
if (sendgrid.exactSha !== 'dfb8df01fa2c6c2c67db80b78f7b42f7577930b7') failures.push('sendgrid exactSha');
if (sendgrid.sourceRef !== 'refs/heads/main') failures.push('sendgrid sourceRef');
if (sendgrid.mode !== 'sendgrid-signed-protected-staging-e2e') failures.push('sendgrid mode');
if (JSON.stringify(sendgrid.allowedDeployScopes) !== JSON.stringify(['functions-explicit-only'])) failures.push('sendgrid allowedDeployScopes');
if (JSON.stringify(sendgrid.initialFunctionDeploymentAllowlist) !== JSON.stringify(['deliveryStatusCallback'])) failures.push('sendgrid function allowlist');
if (JSON.stringify(sendgrid.secretWriteAllowlist) !== JSON.stringify(['SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY','DELIVERY_STATUS_CALLBACK_SECRET'])) failures.push('sendgrid secret allowlist');
if (sendgrid.providerMutationAuthorized !== true) failures.push('sendgrid provider mutation');
if (sendgrid.providerMutationScope !== 'temporary-second-signed-webhook-test-only') failures.push('sendgrid provider mutation scope');
if (sendgrid.sendGridProductionSendingAuthorized !== false) failures.push('sendgrid production sending');
if (sendgrid.sendGridTemporaryWebhookCreateAuthorized !== true) failures.push('sendgrid temporary webhook create');
if (sendgrid.sendGridTemporaryWebhookDeleteRequired !== true) failures.push('sendgrid temporary webhook delete');
if (sendgrid.rollbackToDeliveryDisabledRequired !== true) failures.push('sendgrid rollback requirement');
if (sendgrid.callbackSecretSyntheticOnly !== true) failures.push('sendgrid synthetic callback secret boundary');
if (sendgrid.refVerification?.mode !== 'protected-github-api-or-readonly-deploy-key') failures.push('sendgrid ref verification');
if (sendgrid.refVerification?.environment !== 'staging') failures.push('sendgrid ref verification environment');
if (JSON.stringify(sendgrid.refVerification?.allowedSecrets) !== JSON.stringify(['URAI_CROSS_REPO_READ_TOKEN','URAI_CROSS_REPO_READ_SSH_KEY'])) failures.push('sendgrid ref verification secret contract');

const historicalSpatial = doc.historicalConsumers?.find((entry) => entry.id === 'urai-spatial-pr1591-stripe-test-readiness') || {};
if (historicalSpatial.state !== 'historical') failures.push('historical Spatial state');
if (historicalSpatial.repository !== 'LifeLoggerAI/urai-spatial') failures.push('historical Spatial repository');
if (historicalSpatial.pullRequest !== 1591) failures.push('historical Spatial PR');
if (historicalSpatial.predecessorSha !== '0d6126653c23693a4c4ba383b88bceddaa78302b') failures.push('historical Spatial predecessor');
if ((doc.consumers || []).some((entry) => entry.id === 'urai-spatial-pr1591-stripe-test-readiness')) failures.push('historical Spatial cannot remain active');

const historicalAdmin = doc.historicalConsumers?.find((entry) => entry.id === 'urai-admin-pr57-runtime-closure') || {};
if (historicalAdmin.state !== 'historical') failures.push('historical Admin state');
if (historicalAdmin.repository !== 'LifeLoggerAI/urai-admin') failures.push('historical Admin repository');
if (historicalAdmin.pullRequest !== 57) failures.push('historical Admin PR');
if (historicalAdmin.predecessorSha !== 'fb255310d6b183a59e4252da80c685f45e5cf536') failures.push('historical Admin predecessor');
if (historicalAdmin.mergedHeadSha !== '8050cf2c7d5c5cec8dc360b9f9c25719cef43a29') failures.push('historical Admin merged head');
if (historicalAdmin.mergeCommitSha !== 'f0dabca401dff4df22a68a92b5b10e996b99c748') failures.push('historical Admin merge commit');
if ((doc.consumers || []).some((entry) => entry.id === 'urai-admin-pr57-runtime-closure')) failures.push('historical Admin cannot remain active');
const historicalCommunications = doc.historicalConsumers?.find((entry) => entry.id === 'urai-communications-pr75-source-authority') || {};
if (historicalCommunications.state !== 'historical') failures.push('historical Communications state');
if (historicalCommunications.repository !== 'LifeLoggerAI/urai-communications') failures.push('historical Communications repository');
if (historicalCommunications.pullRequest !== 75) failures.push('historical Communications PR');
if (historicalCommunications.mergedHeadSha !== 'd52b7648561d728466eb701a440f49bd161b4296') failures.push('historical Communications head');
if (historicalCommunications.mergeCommitSha !== 'dfb8df01fa2c6c2c67db80b78f7b42f7577930b7') failures.push('historical Communications merge commit');

if (failures.length) {
  console.error(`staging consumer authority invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging consumer authority contract OK');
