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
if (!Array.isArray(doc.historicalConsumers) || doc.historicalConsumers.length !== 1) failures.push('historical consumers');

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
  if (!c.refVerification || !['public-git-ls-remote','protected-github-api'].includes(c.refVerification.mode)) failures.push(`${c.id || 'consumer'} refVerification`);
}

const spatial = doc.consumers?.find((entry) => entry.id === 'urai-spatial-pr1462-stripe-test-readiness') || {};
if (spatial.repository !== 'LifeLoggerAI/urai-spatial') failures.push('spatial repository');
if (spatial.repositoryId !== 1167675641) failures.push('spatial repositoryId');
if (spatial.pullRequest !== 1462) failures.push('spatial pullRequest');
if (spatial.sourceRef !== 'refs/pull/1462/head') failures.push('spatial sourceRef');
if (spatial.exactSha !== 'bd7794aa60a60d929bf3de6e932fa8148714bbc0') failures.push('spatial exactSha');
if (spatial.mode !== 'stripe-test-provider-readiness') failures.push('spatial mode');
if (!Array.isArray(spatial.allowedDeployScopes) || spatial.allowedDeployScopes.length !== 0) failures.push('spatial allowedDeployScopes');
if (spatial.providerReadOnlyAuthorized !== true) failures.push('spatial providerReadOnlyAuthorized');
if (spatial.appHostingRolloutAuthorized !== false) failures.push('spatial appHostingRolloutAuthorized');
if (spatial.hostingPreviewMutationAuthorized !== false) failures.push('spatial hostingPreviewMutationAuthorized');
if (spatial.stripeTestModeOnly !== true) failures.push('spatial stripeTestModeOnly');
if (spatial.stripeLiveModeAuthorized !== false) failures.push('spatial stripeLiveModeAuthorized');
if (spatial.refVerification?.mode !== 'public-git-ls-remote') failures.push('spatial ref verification');

const communications = doc.consumers?.find((entry) => entry.id === 'urai-communications-pr58-twilio-trial-e2e') || {};
if (communications.repository !== 'LifeLoggerAI/urai-communications') failures.push('communications repository');
if (communications.repositoryId !== 1169785707) failures.push('communications repositoryId');
if (communications.pullRequest !== 58) failures.push('communications pullRequest');
if (communications.sourceRef !== 'refs/pull/58/head') failures.push('communications sourceRef');
if (communications.exactSha !== '15b1a75302b65fb6f3cd90b747e4108a10108c8c') failures.push('communications exactSha');
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
if (communications.refVerification?.mode !== 'protected-github-api') failures.push('communications ref verification');
if (communications.refVerification?.environment !== 'staging') failures.push('communications ref verification environment');
if (communications.refVerification?.requiredSecret !== 'URAI_CROSS_REPO_READ_TOKEN') failures.push('communications ref verification secret contract');
if (communications.trialSenderMode !== 'provider-assigned') failures.push('communications trial sender mode');

const sendgrid = doc.consumers?.find((entry) => entry.id === 'urai-communications-pr58-sendgrid-signed-staging-e2e') || {};
if (sendgrid.repository !== 'LifeLoggerAI/urai-communications') failures.push('sendgrid repository');
if (sendgrid.repositoryId !== 1169785707) failures.push('sendgrid repositoryId');
if (sendgrid.pullRequest !== 58) failures.push('sendgrid pullRequest');
if (sendgrid.exactSha !== '15b1a75302b65fb6f3cd90b747e4108a10108c8c') failures.push('sendgrid exactSha');
if (sendgrid.sourceRef !== 'refs/pull/58/head') failures.push('sendgrid sourceRef');
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
if (sendgrid.refVerification?.mode !== 'protected-github-api') failures.push('sendgrid ref verification');
if (sendgrid.refVerification?.environment !== 'staging') failures.push('sendgrid ref verification environment');
if (sendgrid.refVerification?.requiredSecret !== 'URAI_CROSS_REPO_READ_TOKEN') failures.push('sendgrid ref verification secret contract');

const historicalAdmin = doc.historicalConsumers?.find((entry) => entry.id === 'urai-admin-pr57-runtime-closure') || {};
if (historicalAdmin.state !== 'historical') failures.push('historical Admin state');
if (historicalAdmin.repository !== 'LifeLoggerAI/urai-admin') failures.push('historical Admin repository');
if (historicalAdmin.pullRequest !== 57) failures.push('historical Admin PR');
if (historicalAdmin.predecessorSha !== 'fb255310d6b183a59e4252da80c685f45e5cf536') failures.push('historical Admin predecessor');
if (historicalAdmin.mergedHeadSha !== '8050cf2c7d5c5cec8dc360b9f9c25719cef43a29') failures.push('historical Admin merged head');
if (historicalAdmin.mergeCommitSha !== 'f0dabca401dff4df22a68a92b5b10e996b99c748') failures.push('historical Admin merge commit');
if ((doc.consumers || []).some((entry) => entry.id === 'urai-admin-pr57-runtime-closure')) failures.push('historical Admin cannot remain active');

if (failures.length) {
  console.error(`staging consumer authority invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging consumer authority contract OK');
