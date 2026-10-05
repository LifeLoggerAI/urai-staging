import fs from 'node:fs'
import assert from 'node:assert/strict'
import {
  refContract,
  resolveViaApi,
  verifyConsumers,
} from './verify-private-consumer-refs.mjs'

const workflow = fs.readFileSync('.github/workflows/private-consumer-ref-verification.yml', 'utf8')
const helper = fs.readFileSync('scripts/verify-private-consumer-refs.mjs', 'utf8')

const requiredWorkflow = [
  'name: Protected Private Consumer Ref Verification',
  'environment: staging',
  'URAI_CROSS_REPO_READ_TOKEN',
  'URAI_CROSS_REPO_READ_SSH_KEY',
  'node scripts/verify-private-consumer-refs.mjs',
  'Upload sanitized private consumer ref evidence',
]
for (const marker of requiredWorkflow) {
  if (!workflow.includes(marker)) throw new Error(`missing private consumer ref workflow marker: ${marker}`)
}
for (const forbidden of [
  'firebase deploy',
  'gcloud functions deploy',
  'gcloud run deploy',
  'TWILIO_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'urai-4dc1d',
]) {
  if (workflow.includes(forbidden)) throw new Error(`forbidden private consumer ref workflow marker: ${forbidden}`)
}

const requiredHelper = [
  'protected-github-api',
  'protected-github-api-or-readonly-deploy-key',
  'api.github.com/repos/',
  'git',
  'ls-remote',
  'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl',
  'SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU',
  'if (!ownedSshResolver && sshKey)',
  'StrictHostKeyChecking=yes',
  'ssh-readonly-deploy-key',
  'productionMutationPerformed: false',
  'providerMutationPerformed: false',
  'secretMaterialRetained: false',
]
for (const marker of requiredHelper) {
  if (!helper.includes(marker)) throw new Error(`missing private consumer ref helper marker: ${marker}`)
}
for (const forbidden of [
  'firebase deploy',
  'gcloud functions deploy',
  'gcloud run deploy',
  'TWILIO_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'ssh-keyscan',
]) {
  if (helper.includes(forbidden)) throw new Error(`forbidden private consumer ref helper marker: ${forbidden}`)
}

const sha = 'a'.repeat(40)
const otherSha = 'b'.repeat(40)
const branchConsumer = {
  id: 'branch-fixture',
  state: 'active',
  repository: 'LifeLoggerAI/fixture',
  sourceRef: 'refs/heads/main',
  exactSha: sha,
  refVerification: { mode: 'protected-github-api-or-readonly-deploy-key' },
}
const strictConsumer = {
  ...branchConsumer,
  id: 'strict-fixture',
  refVerification: { mode: 'protected-github-api' },
}
const prConsumer = {
  ...branchConsumer,
  id: 'pr-fixture',
  sourceRef: 'refs/pull/42/head',
  pullRequest: 42,
}

assert.deepEqual(refContract(branchConsumer), {
  refKind: 'branch',
  apiEndpoint: 'branches/main',
  gitRef: 'refs/heads/main',
})
assert.deepEqual(refContract({ ...branchConsumer, sourceRef: 'refs/heads/release/candidate' }), {
  refKind: 'branch',
  apiEndpoint: 'branches/release%2Fcandidate',
  gitRef: 'refs/heads/release/candidate',
})
assert.deepEqual(refContract(prConsumer), {
  refKind: 'pull-request',
  apiEndpoint: 'pulls/42',
  gitRef: 'refs/pull/42/head',
})
assert.throws(
  () => refContract({ ...prConsumer, pullRequest: 43 }),
  /unsupported or inconsistent/,
)
assert.throws(
  () => refContract({ ...branchConsumer, repository: 'bad repo' }),
  /invalid repository/,
)

const requests = []
const api = await resolveViaApi(branchConsumer, 'synthetic-token', async (url, options) => {
  requests.push({ url, options })
  return { ok: true, status: 200, json: async () => ({ commit: { sha } }) }
})
assert.equal(api.liveSha, sha)
assert.equal(api.authMode, 'token')
assert.equal(requests[0].url, 'https://api.github.com/repos/LifeLoggerAI/fixture/branches/main')
assert.match(requests[0].options.headers.authorization, /^Bearer /)

await assert.rejects(
  () => resolveViaApi(branchConsumer, 'bad-token', async () => ({
    ok: false,
    status: 401,
    json: async () => ({}),
  })),
  /HTTP 401/,
)

let sshCalls = 0
const sshResolver = {
  resolve(c) {
    sshCalls += 1
    const contract = refContract(c)
    return { liveSha: sha, refKind: contract.refKind, authMode: 'ssh-readonly-deploy-key' }
  },
}

const fallback = await verifyConsumers({
  doc: { consumers: [branchConsumer] },
  token: 'bad-token',
  sshKey: '',
  fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }),
  sshResolver,
})
assert.equal(sshCalls, 1)
assert.equal(fallback[0].matched, true)
assert.equal(fallback[0].authMode, 'ssh-readonly-deploy-key')

sshCalls = 0
await assert.rejects(
  () => verifyConsumers({
    doc: { consumers: [strictConsumer] },
    token: 'bad-token',
    sshKey: '',
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }),
    sshResolver,
  }),
  /HTTP 401/,
)
assert.equal(sshCalls, 0, 'strict protected-github-api mode must not silently fall back to SSH')

await assert.rejects(
  () => verifyConsumers({
    doc: { consumers: [{ ...branchConsumer, exactSha: otherSha }] },
    token: '',
    sshKey: '',
    fetchImpl: async () => { throw new Error('fetch should not run') },
    sshResolver,
  }),
  /stale expected=/,
)

await assert.rejects(
  () => verifyConsumers({
    doc: { consumers: [branchConsumer] },
    token: '',
    sshKey: '',
    fetchImpl: async () => { throw new Error('fetch should not run') },
    sshResolver: null,
  }),
  /no admitted read-only ref credential/,
)

console.log('protected private consumer ref verification contract OK')
console.log('API, SSH fallback, strict-mode, branch/PR, and stale-SHA boundaries OK')
