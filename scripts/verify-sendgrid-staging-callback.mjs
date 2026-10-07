import assert from 'node:assert/strict';

const project = 'urai-staging';
const service = 'deliverystatuscallback';
const region = 'us-central1';
const callbackBase = 'https://us-central1-urai-staging.cloudfunctions.net/deliveryStatusCallback';

export function verifySendGridStagingCallback({
  logs, functionInfo, callbackUrl, communicationsSha, stagingSha, runId,
  sendGridTestHttp, startTime, runtimeServiceAccount,
}) {
  assert.match(communicationsSha || '', /^[a-f0-9]{40}$/, 'Missing exact Communications source SHA');
  assert.match(stagingSha || '', /^[a-f0-9]{40}$/, 'Missing exact Staging controller SHA');
  assert.match(String(runId || ''), /^[0-9]+$/, 'Missing exact workflow run identity');
  assert.equal(Number(sendGridTestHttp), 204, 'SendGrid integration test did not return 204');
  const startedAt = Date.parse(startTime || '');
  assert.ok(Number.isFinite(startedAt), 'Missing provider test start time');
  const proof = `${communicationsSha.slice(0, 12)}-${runId}`;
  assert.equal(callbackUrl, `${callbackBase}?uraiProof=${proof}`, 'Callback URL does not match canonical run-bound staging authority');
  assert.equal(functionInfo?.name, `projects/${project}/locations/${region}/functions/deliveryStatusCallback`, 'Function readback is not the exact staging callback');
  assert.equal(functionInfo.state, 'ACTIVE', 'Callback function is not ACTIVE');
  assert.match(runtimeServiceAccount || '', /^[^@]+@urai-staging\.iam\.gserviceaccount\.com$/, 'Missing staging runtime identity');
  assert.equal(functionInfo.serviceConfig?.serviceAccountEmail, runtimeServiceAccount, 'Callback runtime identity mismatch');
  const revision = functionInfo.serviceConfig?.revision;
  assert.match(revision || '', /^deliverystatuscallback-[a-z0-9-]+$/, 'Missing exact deployed callback revision');
  assert.ok(Array.isArray(logs), 'Callback logs must be an array');
  const posts = logs.filter((entry) => {
    const labels = entry?.resource?.labels;
    const timestamp = Date.parse(entry?.timestamp || '');
    return entry?.resource?.type === 'cloud_run_revision'
      && labels?.project_id === project && labels?.location === region
      && labels?.service_name === service && labels?.revision_name === revision
      && entry?.httpRequest?.requestMethod === 'POST'
      && entry.httpRequest.requestUrl === callbackUrl
      && Number.isFinite(timestamp) && timestamp >= startedAt;
  });
  assert.ok(posts.length, 'No callback POST matched the exact run, staging project, service, revision, and time');
  const ok = posts.find((entry) => Number(entry.httpRequest.status) >= 200 && Number(entry.httpRequest.status) < 300);
  assert.ok(ok, 'No run-bound staging callback 2xx was observed');
  assert.ok(!posts.some((entry) => String(entry.textPayload || '').includes('invalid_callback_secret')), 'Stale invalid_callback_secret behavior observed for this proof');
  return {
    schemaVersion: 'urai-sendgrid-signed-staging-e2e-2',
    communicationsSha,
    stagingControllerSha: stagingSha,
    workflowRunId: String(runId),
    stagingProject: project,
    sendGridTestHttp: 204,
    callbackHttp: Number(ok.httpRequest.status),
    callbackRevision: revision,
    callbackProof: proof,
    callbackIdentityMatched: true,
    signedWebhook: true,
    realEmailSendPerformed:false,
    productionDeploymentAuthorized:false,
    secretMaterialRetained:false,
  };
}
