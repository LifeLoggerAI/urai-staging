import assert from 'node:assert/strict'
import fs from 'node:fs'

const path = new URL('../config/provider-readiness-20261001.json', import.meta.url)
const registry = JSON.parse(fs.readFileSync(path, 'utf8'))

assert.equal(registry.schemaVersion, 'urai-provider-readiness-delta-2026-10-01-v1')
assert.equal(registry.secretValuesRecorded, false)
assert.equal(registry.supersedesHistoricalRegistry, false)
assert.equal(registry.historicalAuthority, 'config/provider-registry-20260925.json')

const requiredCouncil = ['openai', 'anthropic', 'gemini', 'xai', 'mistral']
const requiredVoice = ['elevenlabs']

function validateProviders(providers, requiredIds, lane) {
  assert.ok(Array.isArray(providers), `${lane} providers must be an array`)
  const ids = providers.map((provider) => provider.id)
  assert.equal(new Set(ids).size, ids.length, `${lane} provider ids must be unique`)
  for (const id of requiredIds) assert.ok(ids.includes(id), `${lane} registry must include ${id}`)

  for (const provider of providers) {
    assert.match(provider.id, /^[a-z0-9-]+$/)
    assert.ok(Array.isArray(provider.capability) && provider.capability.length > 0, `${provider.id} capability is required`)
    assert.ok(Array.isArray(provider.canonicalSecretNames), `${provider.id} canonicalSecretNames must be an array`)
    for (const secretName of provider.canonicalSecretNames) {
      assert.match(secretName, /^[A-Z][A-Z0-9_]*$/, `${provider.id} secret names must contain names only`)
    }
    assert.equal(typeof provider.sourceWired, 'boolean', `${provider.id} sourceWired must be boolean`)
    assert.equal(typeof provider.runtimeCertified, 'boolean', `${provider.id} runtimeCertified must be boolean`)
    assert.equal(typeof provider.liveSmokeThisPass, 'boolean', `${provider.id} liveSmokeThisPass must be boolean`)
    assert.ok(typeof provider.sourceAuthority === 'string' && provider.sourceAuthority.length > 0)
    assert.ok(typeof provider.activation === 'string' && provider.activation.length > 0)
    assert.ok(typeof provider.gap === 'string' && provider.gap.length > 0)

    if (provider.runtimeCertified) {
      assert.equal(provider.sourceWired, true, `${provider.id} cannot be runtime certified without source wiring`)
      assert.equal(provider.liveSmokeThisPass, true, `${provider.id} cannot be runtime certified without a live smoke this pass`)
    }
    if (provider.activation === 'not-wired') {
      assert.equal(provider.sourceWired, false, `${provider.id} not-wired activation must match sourceWired=false`)
      assert.equal(provider.runtimeCertified, false, `${provider.id} not-wired provider cannot be runtime certified`)
    }
  }
}

validateProviders(registry.councilProviders, requiredCouncil, 'Council')
validateProviders(registry.voiceProviders, requiredVoice, 'Voice')

const communicationsExactSha = 'd52b7648561d728466eb701a440f49bd161b4296'
assert.equal(registry.sourceSnapshot?.repository, 'LifeLoggerAI/urai-communications')
assert.equal(registry.sourceSnapshot?.pullRequest, 75)
assert.equal(registry.sourceSnapshot?.exactSha, communicationsExactSha)
assert.equal(registry.sourceSnapshot?.status, 'open-draft-source-authority-not-production')

for (const id of requiredCouncil) {
  const provider = registry.councilProviders.find((entry) => entry.id === id)
  assert.equal(provider.sourceWired, true, `${id} must reflect the governed adapter now present on Communications PR #75`)
  assert.equal(provider.runtimeCertified, false, `${id} must remain uncertified until protected-runtime live evidence exists`)
  assert.equal(provider.liveSmokeThisPass, false, `${id} must not claim a live smoke that did not occur`)
  assert.match(provider.activation, /consent/i, `${id} external processing must remain consent-gated`)
  assert.match(provider.sourceAuthority, new RegExp(communicationsExactSha), `${id} source authority must bind the exact Communications head`)
}

const openai = registry.councilProviders.find((entry) => entry.id === 'openai')
assert.equal(openai.runtimeCertified, false)

const elevenlabs = registry.voiceProviders.find((entry) => entry.id === 'elevenlabs')
assert.equal(elevenlabs.sourceWired, true)
assert.equal(elevenlabs.runtimeCertified, false)
assert.match(elevenlabs.activation, /consent/i)

const forbiddenPropertyNames = new Set(['secretValue', 'tokenValue', 'apiKeyValue', 'credentialValue'])
function rejectForbiddenProperties(value, at = 'registry') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenProperties(entry, `${at}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!forbiddenPropertyNames.has(key), `registry must not contain forbidden property ${at}.${key}`)
    rejectForbiddenProperties(child, `${at}.${key}`)
  }
}
rejectForbiddenProperties(registry)


const consumers = JSON.parse(fs.readFileSync(new URL('../config/staging-consumers.json', import.meta.url), 'utf8')).consumers
const activeCommunications = consumers.filter(entry => entry.state === 'active' && entry.repository === registry.sourceSnapshot.repository)
assert.ok(activeCommunications.length > 0, 'provider snapshot requires an active Communications consumer')
for (const consumer of activeCommunications) {
  assert.equal(consumer.exactSha, registry.sourceSnapshot.exactSha, 'provider snapshot must match active Communications consumer authority')
  assert.equal(consumer.pullRequest, registry.sourceSnapshot.pullRequest, 'provider snapshot PR must match active Communications consumer authority')
}

console.log('provider readiness delta valid')
