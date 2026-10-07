import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifySendGridStagingCallback } from './verify-sendgrid-staging-callback.mjs';
import { sourceProfile } from './verify-staging-verification-binding.mjs';

const communicationsSha = sourceProfile('working-pr84').sha;
const stagingSha = 'b'.repeat(40);
const callbackUrl = `https://us-central1-urai-staging.cloudfunctions.net/deliveryStatusCallback?uraiProof=${communicationsSha.slice(0, 12)}-123`;
const revision = 'deliverystatuscallback-00042-abc';
const runtimeServiceAccount = 'urai-staging-functions-runtime@urai-staging.iam.gserviceaccount.com';
const post = {
  timestamp: '2026-10-07T05:00:01Z',
  resource: { type: 'cloud_run_revision', labels: {
    project_id: 'urai-staging', location: 'us-central1', service_name: 'deliverystatuscallback', revision_name: revision,
  } },
  httpRequest: { requestMethod: 'POST', requestUrl: callbackUrl, status: 200 },
};
const fixture = () => ({
  logs: [structuredClone(post)],
  functionInfo: { name: 'projects/urai-staging/locations/us-central1/functions/deliveryStatusCallback', state: 'ACTIVE', serviceConfig: { revision, serviceAccountEmail: runtimeServiceAccount } },
  callbackUrl, communicationsSha, stagingSha, runId: '123', sendGridTestHttp: 204,
  startTime: '2026-10-07T05:00:00Z', runtimeServiceAccount,
  communicationsLiveRefVerified:true,
  verificationBinding:{schemaVersion:'urai-proposed-staging-verification-binding-v1',scope:'proposed-staging-verification-only',
    provider:'sendgrid',profileName:'working-pr84',communications:sourceProfile('working-pr84'),canonicalConsumerAdopted:false,
    canonicalConsumerSha:sourceProfile('canonical-main').sha,stagingControllerSha:stagingSha,workflowRunId:'123',
    checkedAt:'2026-10-07T04:59:00Z',providerMutationAuthorizedByThisReceipt:false,productionDeploymentAuthorized:false,
    approval:{repository:'LifeLoggerAI/urai-staging',prNumber:109,sha:stagingSha,reviewer:'LimberNutz0',reviewId:101,
      reviewerAccountType:'User',reviewerPermission:'write',requiredWorkflows:['CI','URAI Production Verify']}},
});

test('seals a successful provider test only against its exact run and deployed callback', () => {
  const receipt = verifySendGridStagingCallback(fixture());
  assert.equal(receipt.callbackRevision, revision);
  assert.equal(receipt.stagingControllerSha, stagingSha);
  assert.equal(receipt.communicationsSha, communicationsSha);
  assert.equal(receipt.workflowRunId, '123');
  assert.equal(receipt.callbackIdentityMatched, true);
  assert.equal(receipt.stagingReviewPr,109);
  assert.equal(receipt.nativeReviewer,'LimberNutz0');
  assert.equal(receipt.communicationsPr,84);
  assert.equal(receipt.canonicalConsumerAdopted,false);
  assert.equal(receipt.secretMaterialRetained, false);
  assert.ok(!JSON.stringify(receipt).includes(runtimeServiceAccount));
});

test('unrelated or predecessor callback POSTs cannot certify the current provider test', () => {
  for (const requestUrl of [callbackUrl.replace('-123', '-122'), callbackUrl.replace('deliveryStatusCallback', 'otherCallback'), callbackUrl.replace('uraiProof=', 'unrelated='), 'https://us-central1-urai-staging.cloudfunctions.net/deliveryStatusCallback']) {
    const input = fixture(); input.logs[0].httpRequest.requestUrl = requestUrl;
    assert.throws(() => verifySendGridStagingCallback(input), /No callback POST matched/);
  }
});

test('wrong project, service, region or deployed revision cannot certify the test', () => {
  for (const [key, value] of [['project_id', 'urai-communications-prod'], ['service_name', 'otherfunction'], ['location', 'europe-west1'], ['revision_name', 'deliverystatuscallback-00041-old']]) {
    const input = fixture(); input.logs[0].resource.labels[key] = value;
    assert.throws(() => verifySendGridStagingCallback(input), /No callback POST matched/);
  }
});

test('pre-test, malformed and failed HTTP records do not become callback acceptance', () => {
  for (const timestamp of ['2026-10-07T04:59:59Z', 'invalid']) {
    const input = fixture(); input.logs[0].timestamp = timestamp;
    assert.throws(() => verifySendGridStagingCallback(input), /No callback POST matched/);
  }
  for (const status of [401, 403, 500]) {
    const input = fixture(); input.logs[0].httpRequest.status = status;
    assert.throws(() => verifySendGridStagingCallback(input), /No run-bound staging callback 2xx/);
  }
});

test('missing source, provider test, workflow or callback authority fails closed', () => {
  for (const change of [{ communicationsSha: undefined }, { stagingSha: undefined }, { runId: undefined }, { sendGridTestHttp: 500 }, { startTime: undefined }, { callbackUrl: callbackUrl.replace('urai-staging', 'urai-communications-prod') }]) {
    assert.throws(() => verifySendGridStagingCallback({ ...fixture(), ...change }));
  }
});

test('missing or wrong function and runtime readback fails closed', () => {
  for (const change of [{ functionInfo: undefined }, { runtimeServiceAccount: 'deployer@urai-communications-prod.iam.gserviceaccount.com' }]) {
    assert.throws(() => verifySendGridStagingCallback({ ...fixture(), ...change }));
  }
  for (const update of [x => { x.state = 'FAILED'; }, x => { x.name = x.name.replace('urai-staging', 'production'); }, x => { delete x.serviceConfig.revision; }, x => { x.serviceConfig.serviceAccountEmail = 'different@urai-staging.iam.gserviceaccount.com'; }]) {
    const input = fixture(); update(input.functionInfo);
    assert.throws(() => verifySendGridStagingCallback(input));
  }
});

test('matching proof can coexist with unrelated traffic without retaining raw logs', () => {
  const input = fixture();
  input.logs.unshift({ ...structuredClone(post), httpRequest: { requestMethod: 'POST', status: 200, requestUrl: 'https://unrelated.example/' }, textPayload: 'private raw log value' });
  const receipt = verifySendGridStagingCallback(input);
  assert.ok(!JSON.stringify(receipt).includes('private raw log value'));
});

test('callback proof cannot promote missing or predecessor native review/source binding',()=>{
  for(const mutate of [x=>{delete x.verificationBinding;},x=>{x.communicationsLiveRefVerified=false;},
    x=>{x.verificationBinding.workflowRunId='122';},x=>{x.verificationBinding.approval.prNumber=106;},
    x=>{x.verificationBinding.approval.sha='a'.repeat(40);},x=>{x.verificationBinding.approval.reviewer='Other';}]){
    const input=structuredClone(fixture());mutate(input);assert.throws(()=>verifySendGridStagingCallback(input));
  }
});
