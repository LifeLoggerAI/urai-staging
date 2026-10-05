import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/private-consumer-ref-verification.yml','utf8');
const required = [
  'name: Protected Private Consumer Ref Verification',
  'environment: staging',
  'URAI_CROSS_REPO_READ_TOKEN',
  'config/staging-consumers.json',
  'api.github.com/repos/',
  'pulls/${c.pullRequest}',
  'branches/${encodeURIComponent(branch[1])}',
  'protected-github-api',
  'productionMutationPerformed: false',
  'providerMutationPerformed: false',
  'Upload sanitized private consumer ref evidence',
];
for (const marker of required) {
  if (!workflow.includes(marker)) throw new Error(`missing private consumer ref verification marker: ${marker}`);
}
for (const forbidden of ['firebase deploy','gcloud functions deploy','gcloud run deploy','TWILIO_AUTH_TOKEN','STRIPE_SECRET_KEY','urai-4dc1d']) {
  if (workflow.includes(forbidden)) throw new Error(`forbidden private consumer ref verification marker: ${forbidden}`);
}
console.log('protected private consumer ref verification workflow contract OK');

// Exercise the exact embedded workflow code without credentials or network.
const embedded = workflow.match(/node <<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm, '');
const sha = 'a'.repeat(40);
const base = { id:'fixture', state:'active', repository:'LifeLoggerAI/fixture', exactSha:sha, refVerification:{mode:'protected-github-api'} };
async function execute(consumer, body, status = 200) {
  const requests = [];
  const writes = [];
  const errors = [];
  const sandbox = {
    require: () => ({ readFileSync: () => JSON.stringify({consumers:[consumer]}), writeFileSync: (path, value) => writes.push(JSON.parse(value)) }),
    process: { env: { CROSS_REPO_READ_TOKEN:'synthetic-test-token' }, exit: (code) => errors.push(code) },
    console: { error: (error) => errors.push(String(error)) },
    fetch: async (url) => { requests.push(url); return {ok:status===200, status, json:async()=>body}; },
  };
  vm.runInNewContext(embedded, sandbox);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return {requests,writes,errors};
}
let result = await execute({...base,sourceRef:'refs/heads/main'}, {commit:{sha}});
assert.equal(result.errors.length, 0);
assert.equal(result.requests[0], 'https://api.github.com/repos/LifeLoggerAI/fixture/branches/main');
assert.equal(result.writes[0].results[0].liveSha, sha);
assert.equal(result.writes[0].results[0].refKind, 'branch');
result = await execute({...base,sourceRef:'refs/heads/release/candidate'}, {commit:{sha}});
assert.ok(result.requests[0].endsWith('/branches/release%2Fcandidate'));
result = await execute({...base,sourceRef:'refs/pull/42/head',pullRequest:42}, {head:{sha}});
assert.equal(result.errors.length, 0);
assert.ok(result.requests[0].endsWith('/pulls/42'));
for (const fixture of [
  {consumer:{...base,sourceRef:'refs/heads/main'},body:{commit:{sha:'b'.repeat(40)}}},
  {consumer:{...base,sourceRef:'refs/heads/main'},body:{head:{sha}}},
  {consumer:{...base,sourceRef:'refs/pull/42/head',pullRequest:43},body:{head:{sha}}},
  {consumer:{...base,sourceRef:'refs/tags/release'},body:{commit:{sha}}},
  {consumer:{...base,sourceRef:'refs/heads/main'},body:{},status:403},
]) {
  result = await execute(fixture.consumer, fixture.body, fixture.status);
  assert.ok(result.errors.length > 0);
  assert.equal(result.writes.length, 0, 'failed verification must not produce a success receipt');
}
console.log('protected consumer branch/PR behavior and failure boundaries OK (8 cases)');
