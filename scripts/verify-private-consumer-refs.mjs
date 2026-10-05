#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const protectedModes = new Set([
  'protected-github-api',
  'protected-github-api-or-readonly-deploy-key',
])

export function refContract(c) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repository || '')) {
    throw new Error(`${c.id}: invalid repository`)
  }
  const branch = /^refs\/heads\/(.+)$/.exec(c.sourceRef || '')
  if (branch && !Number.isInteger(c.pullRequest)) {
    return {
      refKind: 'branch',
      apiEndpoint: `branches/${encodeURIComponent(branch[1])}`,
      gitRef: c.sourceRef,
    }
  }
  if (
    Number.isInteger(c.pullRequest) &&
    c.pullRequest > 0 &&
    c.sourceRef === `refs/pull/${c.pullRequest}/head`
  ) {
    return {
      refKind: 'pull-request',
      apiEndpoint: `pulls/${c.pullRequest}`,
      gitRef: c.sourceRef,
    }
  }
  throw new Error(`${c.id}: unsupported or inconsistent sourceRef/pullRequest`)
}

export async function resolveViaApi(c, token, fetchImpl = globalThis.fetch) {
  if (!token) {
    const error = new Error(`${c.id}: protected cross-repo read token missing`)
    error.status = 0
    throw error
  }
  const contract = refContract(c)
  const url = `https://api.github.com/repos/${c.repository}/${contract.apiEndpoint}`
  const response = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  })
  if (!response.ok) {
    const error = new Error(`${c.id}: GitHub API returned HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  const body = await response.json()
  const liveSha = contract.refKind === 'branch' ? body?.commit?.sha : body?.head?.sha
  if (!/^[0-9a-f]{40}$/.test(liveSha || '')) throw new Error(`${c.id}: invalid live ref SHA`)
  return { liveSha, refKind: contract.refKind, authMode: 'token' }
}

function makeSshResolver(sshKey) {
  if (!sshKey) return null
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-private-ref-'))
  const keyFile = path.join(tempDir, 'read-key')
  const knownHosts = path.join(tempDir, 'known-hosts')
  fs.writeFileSync(keyFile, sshKey.endsWith('\n') ? sshKey : `${sshKey}\n`, { mode: 0o600 })
  const hostKeys = execFileSync('ssh-keyscan', ['-t', 'ed25519', 'github.com'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  fs.writeFileSync(knownHosts, hostKeys, { mode: 0o600 })

  return {
    resolve(c) {
      const contract = refContract(c)
      const env = {
        ...process.env,
        GIT_SSH_COMMAND: `ssh -i ${keyFile} -o IdentitiesOnly=yes -o UserKnownHostsFile=${knownHosts} -o StrictHostKeyChecking=yes`,
      }
      const output = execFileSync(
        'git',
        ['ls-remote', `git@github.com:${c.repository}.git`, contract.gitRef],
        { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] },
      )
      const liveSha = output.trim().split(/\s+/)[0] || ''
      if (!/^[0-9a-f]{40}$/.test(liveSha)) {
        throw new Error(`${c.id}: read-only deploy key returned no valid SHA for ${contract.gitRef}`)
      }
      return { liveSha, refKind: contract.refKind, authMode: 'ssh-readonly-deploy-key' }
    },
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true })
    },
  }
}

export async function verifyConsumers({
  doc,
  token,
  sshKey,
  fetchImpl = globalThis.fetch,
  sshResolver = null,
}) {
  const consumers = (doc.consumers || []).filter(
    (c) => c.state === 'active' && protectedModes.has(c.refVerification?.mode),
  )
  const ownedSshResolver = sshResolver || makeSshResolver(sshKey)
  const results = []
  try {
    for (const c of consumers) {
      let resolved = null
      let apiError = null
      if (token) {
        try {
          resolved = await resolveViaApi(c, token, fetchImpl)
        } catch (error) {
          apiError = error
        }
      }

      const allowsSshFallback =
        c.refVerification?.mode === 'protected-github-api-or-readonly-deploy-key'

      if (!resolved && allowsSshFallback && ownedSshResolver) {
        resolved = ownedSshResolver.resolve(c)
      }

      if (!resolved) {
        if (apiError) throw apiError
        throw new Error(
          `${c.id}: no admitted read-only ref credential is available for ${c.refVerification?.mode}`,
        )
      }

      const matched = resolved.liveSha === c.exactSha
      results.push({
        id: c.id,
        repository: c.repository,
        pullRequest: c.pullRequest,
        sourceRef: c.sourceRef,
        refKind: resolved.refKind,
        expectedSha: c.exactSha,
        liveSha: resolved.liveSha,
        matched,
        authMode: resolved.authMode,
      })
      if (!matched) {
        throw new Error(`${c.id}: stale expected=${c.exactSha} live=${resolved.liveSha}`)
      }
    }
    return results
  } finally {
    if (!sshResolver) ownedSshResolver?.cleanup()
  }
}

async function main() {
  const doc = JSON.parse(fs.readFileSync('config/staging-consumers.json', 'utf8'))
  const token = process.env.CROSS_REPO_READ_TOKEN || ''
  const sshKey = process.env.CROSS_REPO_READ_SSH_KEY || ''
  if (!token && !sshKey) {
    throw new Error('URAI_CROSS_REPO_READ_TOKEN or URAI_CROSS_REPO_READ_SSH_KEY is required')
  }
  const results = await verifyConsumers({ doc, token, sshKey })
  fs.mkdirSync('artifacts/private-consumer-refs', { recursive: true })
  fs.writeFileSync(
    'artifacts/private-consumer-refs/receipt.json',
    `${JSON.stringify({
      schemaVersion: 'urai-staging-private-consumer-ref-verification-2',
      generatedAt: new Date().toISOString(),
      stagingRepository: process.env.GITHUB_REPOSITORY,
      stagingSha: process.env.GITHUB_SHA,
      verificationMode: 'protected-github-api-with-readonly-deploy-key-fallback',
      admittedRefVerificationModes: [...protectedModes],
      results,
      productionMutationPerformed: false,
      providerMutationPerformed: false,
      secretMaterialRetained: false,
    }, null, 2)}\n`,
  )
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
