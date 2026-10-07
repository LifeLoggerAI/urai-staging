import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyStagingApproval } from './verify-sendgrid-staging-approval.mjs';

export const controller = Object.freeze({ repository:'LifeLoggerAI/urai-staging', pr:109,
  branch:'repair/staging-provider-harness-converged-20261007', base:'main', reviewer:'LimberNutz0' });
export const canonicalCommunicationsSha = '89e37603ef28a1309e2311ed7cf36bd64592b8c8';
const profiles = Object.freeze({
  'canonical-main': Object.freeze({ repository:'LifeLoggerAI/urai-communications', sha:canonicalCommunicationsSha, branch:'main', pr:null }),
  'working-pr84': Object.freeze({ repository:'LifeLoggerAI/urai-communications', sha:'274f53573f4d3bf843047e285f080083a55fe1ab',
    branch:'codex/communications-component-integration-20261007', pr:84 }),
});
export function sourceProfile(name) {
  assert.ok(Object.hasOwn(profiles,name), 'Unknown governed Communications source profile');
  return profiles[name];
}
export function verifyCanonicalPolicy(policy, provider) {
  assert.equal(policy.schemaVersion,'urai-staging-consumers-2');
  assert.equal(policy.productionAllowed,false);
  assert.equal(policy.projectId,'urai-staging');
  const id = provider === 'sendgrid' ? 'urai-communications-main-sendgrid-signed-staging-e2e'
    : provider === 'twilio' ? 'urai-communications-main-twilio-trial-e2e' : null;
  assert.ok(id,'Unknown protected provider');
  const consumer = policy.consumers?.find(entry => entry.id === id);
  assert.ok(consumer,'Current canonical provider consumer is missing');
  assert.equal(consumer.state,'active');
  assert.equal(consumer.repository,profiles['canonical-main'].repository);
  assert.equal(consumer.exactSha,canonicalCommunicationsSha,'Canonical consumer pin changed; explicit new source policy is required');
  assert.equal(consumer.sourceRef,'refs/heads/main');
  assert.equal(consumer.providerProject,'urai-staging');
  assert.equal(consumer.allowedEnvironment,'staging');
  assert.equal(consumer.dataPolicy,'synthetic-only');
  assert.equal(consumer.productionDeploymentAuthorized,false);
  assert.equal(consumer.productionDataAuthorized,false);
  assert.equal(consumer.rollbackToDeliveryDisabledRequired,true);
  const functions = provider === 'sendgrid' ? ['deliveryStatusCallback']
    : ['adminTwilioTestSend','adminProviderReadiness','adminDeliveryProof','twilioDeliveryStatusCallback'];
  const secrets = provider === 'sendgrid' ? ['SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY','DELIVERY_STATUS_CALLBACK_SECRET']
    : ['TWILIO_AUTH_TOKEN','TWILIO_ACCOUNT_SID','TWILIO_API_KEY_SID','TWILIO_API_KEY_SECRET'];
  assert.deepEqual(consumer.initialFunctionDeploymentAllowlist,functions);
  assert.deepEqual(consumer.secretWriteAllowlist,secrets);
  if (provider === 'sendgrid') {
    assert.equal(consumer.sendGridProductionSendingAuthorized,false);
    assert.equal(consumer.sendGridTemporaryWebhookDeleteRequired,true);
  } else {
    assert.equal(consumer.twilioTrialModeOnly,true);
    assert.equal(consumer.trialSenderMode,'explicit-owned-trial-number');
    assert.equal(consumer.twilioProductionMessagingAuthorized,false);
  }
  return consumer;
}
export async function verifyStagingVerificationBinding({ sha, ref, profileName, expectedCommunicationsSha, runId, provider, policy, api }) {
  assert.equal(ref,`refs/heads/${controller.branch}`,'Only the owned proposed controller branch can execute this verification source');
  assert.match(String(runId || ''),/^[0-9]+$/,'Missing workflow execution identity');
  const source = sourceProfile(profileName);
  if (expectedCommunicationsSha !== undefined) assert.equal(expectedCommunicationsSha,source.sha,'Supplied source SHA is outside selected governed profile');
  verifyCanonicalPolicy(policy,provider);
  const prPath = `/repos/${controller.repository}/pulls/${controller.pr}`;
  const checkLineage = pr => {
    assert.equal(pr.head?.ref,controller.branch,'Wrong controller source branch');
    assert.equal(pr.base?.ref,controller.base,'Wrong controller review lineage');
    assert.equal(pr.base?.repo?.full_name,controller.repository,'Wrong controller base repository');
  };
  const first = await api(prPath); checkLineage(first);
  const approval = await verifyStagingApproval({ sha,prNumber:controller.pr,api });
  const last = await api(prPath); checkLineage(last);
  assert.equal(last.head?.sha,sha,'Controller moved during scoped binding verification');
  assert.equal(last.updated_at,first.updated_at,'Controller metadata moved during scoped binding verification');
  return { schemaVersion:'urai-proposed-staging-verification-binding-v1',
    scope:'proposed-staging-verification-only', provider, profileName, communications:source,
    canonicalConsumerSha:canonicalCommunicationsSha, canonicalConsumerAdopted:false,
    stagingControllerSha:sha, workflowRunId:String(runId), checkedAt:new Date().toISOString(), approval,
    communicationsLiveRefVerifiedByThisReceipt:false,
    providerMutationAuthorizedByThisReceipt:false, productionDeploymentAuthorized:false };
}
export function checkRetainedBinding(binding,{ stagingSha,communicationsSha,runId,provider }) {
  assert.equal(binding?.schemaVersion,'urai-proposed-staging-verification-binding-v1','Missing retained scoped verification binding');
  assert.equal(binding.scope,'proposed-staging-verification-only');
  assert.equal(binding.provider,provider);
  assert.equal(binding.stagingControllerSha,stagingSha,'Retained binding belongs to another controller SHA');
  assert.equal(binding.workflowRunId,String(runId),'Retained binding belongs to another workflow run');
  assert.equal(binding.canonicalConsumerSha,canonicalCommunicationsSha);
  assert.equal(binding.canonicalConsumerAdopted,false);
  const source = sourceProfile(binding.profileName);
  assert.deepEqual(binding.communications,source,'Retained source identity is not a governed profile');
  assert.equal(source.sha,communicationsSha,'Retained binding belongs to another Communications SHA');
  const approval = binding.approval;
  assert.equal(approval?.repository,controller.repository);
  assert.equal(approval?.prNumber,controller.pr,'Wrong native controller review PR');
  assert.equal(approval?.sha,stagingSha,'Native review belongs to another executing SHA');
  assert.equal(approval?.reviewer,controller.reviewer,'Wrong native independent reviewer');
  assert.ok(Number.isSafeInteger(approval?.reviewId) && approval.reviewId > 0,'Missing native review ID');
  assert.equal(approval.reviewerAccountType,'User');
  assert.ok(['write','maintain','admin'].includes(approval.reviewerPermission),'Unknown native reviewer eligibility');
  assert.deepEqual(approval.requiredWorkflows,['CI','URAI Production Verify']);
  assert.ok(Number.isFinite(Date.parse(binding.checkedAt || '')),'Missing native preflight timestamp');
  assert.equal(binding.providerMutationAuthorizedByThisReceipt,false);
  assert.equal(binding.productionDeploymentAuthorized,false);
  return { stagingReviewPr:controller.pr, nativeReviewer:controller.reviewer, nativeReviewId:approval.reviewId,
    nativeReviewerPermission:approval.reviewerPermission,nativePreflightCheckedAt:binding.checkedAt,
    communicationsProfile:binding.profileName, communicationsPr:source.pr, canonicalConsumerAdopted:false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const token = process.env.GITHUB_TOKEN;
    assert.ok(token,'Missing read-only native review metadata token');
    const api = async (route,body) => {
      const response = await fetch('https://api.github.com'+route,{ method:body?'POST':'GET',
        signal:AbortSignal.timeout(30000),
        headers:{ Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json' },
        ...(body?{body:JSON.stringify(body)}:{}) });
      assert.ok(response.ok,`Native review metadata unavailable: ${response.status}`);
      return response.json();
    };
    const binding = await verifyStagingVerificationBinding({ sha:process.env.GITHUB_SHA,ref:process.env.GITHUB_REF,
      profileName:process.env.COMMUNICATIONS_SOURCE_PROFILE,expectedCommunicationsSha:process.env.EXPECTED_COMMUNICATIONS_SHA,
      runId:process.env.GITHUB_RUN_ID,provider:process.env.STAGING_PROVIDER,
      policy:JSON.parse(fs.readFileSync('config/staging-consumers.json','utf8')),api });
    assert.ok(process.env.RUNNER_TEMP && process.env.GITHUB_ENV,'Missing confined native workflow paths');
    const receiptPath = path.join(process.env.RUNNER_TEMP,'staging-verification-binding.json');
    fs.writeFileSync(receiptPath,JSON.stringify(binding,null,2)+'\n',{mode:0o600});
    const source=binding.communications;
    fs.appendFileSync(process.env.GITHUB_ENV,
      `COMMUNICATIONS_SHA=${source.sha}\nCOMMUNICATIONS_BRANCH=${source.branch}\nSTAGING_VERIFICATION_BINDING_PATH=${receiptPath}\n`);
    console.log(JSON.stringify(binding));
  } catch(error) { console.error('[FAIL] '+error.message); process.exitCode=1; }
}



