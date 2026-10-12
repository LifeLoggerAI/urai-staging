#!/usr/bin/env node
// Real static consumer export -> immutable candidate payload.
// No cloud credentials, network requests, source deployments or private media.
// The output is NOT an authorized Firebase deployment: access restriction,
// staging controller review and Spatial function admission remain separate.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const shaPattern = /^[a-f0-9]{40}$/
const requiredPages = [
  'index.html', 'home/index.html', 'ascent/index.html',
  'life-map/index.html', 'focus/index.html', 'replay/index.html',
  'unwind/index.html', 'login/index.html',
  'privacy-controls/index.html', 'privacy-policy/index.html', 'support/index.html',
]
const unsafePublicNames = /(?:^|\/)(?:\.env(?:\..*)?|firebase-adminsdk[^/]*\.json|[^/]+\.(?:pem|p12|pfx|key)|service-account[^/]*\.json)$|(?:^|\/)(?:\.git|node_modules)(?:\/|$)/i
const perFileLimit = 128 * 1024 * 1024
const totalLimit = 1024 * 1024 * 1024
const fileCountLimit = 40000
const fingerprintFile = 'api/system/deploy-proof'
const boundaryFile = 'static-launch-boundary.json'

function readObject(file, label) {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(label + ' must be a regular file')
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(label + ' must be a JSON object')
  return parsed
}

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex') }

function safeWalk(root) {
  const results = [], used = new Set()
  let total = 0
  function visit(dir, relative = '') {
    for (const name of fs.readdirSync(dir).sort()) {
      const relativeName = relative ? relative + '/' + name : name
      const absolute = path.join(dir, name)
      const stat = fs.lstatSync(absolute)
      if (stat.isSymbolicLink()) throw new Error('Static export symlink denied: ' + relativeName)
      if (unsafePublicNames.test(relativeName)) throw new Error('Private or executable secret file denied: ' + relativeName)
      if (stat.isDirectory()) { visit(absolute, relativeName); continue }
      if (!stat.isFile()) throw new Error('Non-regular static export entry: ' + relativeName)
      if (stat.size > perFileLimit) throw new Error('Oversized export file: ' + relativeName)
      const collision = relativeName.toLowerCase()
      if (used.has(collision)) throw new Error('Case-insensitive static path collision: ' + relativeName)
      used.add(collision)
      const bytes = fs.readFileSync(absolute)
      total += bytes.length
      if (total > totalLimit || results.length >= fileCountLimit) throw new Error('Static payload exceeds bounded size/count')
      results.push({ path: relativeName, bytes: bytes.length, sha256: hash(bytes) })
    }
  }
  visit(root)
  return { files: results, totalBytes: total }
}

function assertSource(src, candidate) {
  if (candidate.schemaVersion !== 'urai-spatial-consumer-staging-candidate-1' ||
    candidate.repository !== 'LifeLoggerAI/urai-spatial' ||
    !shaPattern.test(candidate.sourceSha) ||
    candidate.stagingRepository !== 'LifeLoggerAI/urai-staging' ||
    candidate.stagingProject !== 'urai-staging' ||
    candidate.sourcePullRequest !== 1810 || candidate.controllerPullRequest !== 1636 ||
    candidate.stagingControllerPullRequest !== 109 || candidate.state !== 'source-only-pending-governed-admission' ||
    candidate.finalAssetAdmissions !== 0 ||
    candidate.independentReviewApproved !== false ||
    candidate.accessRestrictedStagingConfigured !== false ||
    candidate.consumerHostingMutationAuthorized !== false ||
    candidate.spatialFunctionsStagingAdmitted !== false ||
    candidate.productionDeploymentAuthorized !== false ||
    candidate.publicLaunchAuthorized !== false ||
    candidate.originalMediaAuthorizedForArtifact !== false) {
    throw new Error('Unapproved consumer or asset authority in source candidate')
  }
  const proof = readObject(path.join(src, fingerprintFile), 'Compiled Spatial deployment proof')
  const boundary = readObject(path.join(src, boundaryFile), 'Spatial static route gate')
  if (proof.service !== 'urai-spatial-deploy-proof' || proof.repository !== candidate.repository ||
    proof.deploymentFreshness?.commitSha !== candidate.sourceSha) {
    throw new Error('Static export compiled authority does not match pinned Spatial source')
  }
  if (boundary.releaseClassification !== 'NO-GO' ||
    boundary.providerActivation !== false || boundary.deviceAcceptance !== false ||
    boundary.sourceSha !== candidate.sourceSha ||
    !Array.isArray(boundary.routes) ||
    boundary.routes.some(route => typeof route.enabled !== 'boolean')) {
    throw new Error('Static launch boundary is not fail-closed for this exact source')
  }
  for (const route of boundary.routes) {
    if (!route.enabled) {
      for (const suffix of ['/index.html', '.html']) {
        if (fs.existsSync(path.join(src, route.route.replace(/^\/+/, '') + suffix))) {
          throw new Error('Disabled XR route contains publicly served HTML: ' + route.route)
        }
      }
    }
  }
}

export function prepareConsumerStagingBundle({ spatialExport, outputDirectory, candidatePath }) {
  for (const [value, label] of [[spatialExport, 'spatialExport'], [outputDirectory, 'outputDirectory'], [candidatePath, 'candidatePath']]) {
    if (!value || typeof value !== 'string') throw new Error('Missing required ' + label)
  }
  const src = path.resolve(spatialExport), dst = path.resolve(outputDirectory), candidateFile = path.resolve(candidatePath)
  const sourceStat = fs.lstatSync(src)
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) throw new Error('Spatial export must be a physical directory')
  if (dst === src || dst.startsWith(src + path.sep) || src.startsWith(dst + path.sep)) {
    throw new Error('Output must be separate from the input source')
  }
  if (fs.existsSync(dst)) throw new Error('Output already exists; refuse overwrite of prior evidence')
  const candidate = readObject(candidateFile, 'Candidate declaration')
  const listing = safeWalk(src)
  for (const page of requiredPages) {
    if (!listing.files.some(item => item.path === page)) throw new Error('Real consumer build route missing: ' + page)
  }
  if (!listing.files.some(item => item.path.startsWith('_next/static/') && item.path.endsWith('.js'))) {
    throw new Error('Actual compiled Next.js JavaScript is missing')
  }
  assertSource(src, candidate)

  const payload = path.join(dst, 'public')
  fs.mkdirSync(payload, { recursive: true })
  for (const item of listing.files) {
    const from = path.join(src, ...item.path.split('/'))
    const to = path.join(payload, ...item.path.split('/'))
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL)
  }
  const copied = safeWalk(payload)
  if (JSON.stringify(copied) !== JSON.stringify(listing)) throw new Error('Staged consumer bytes differ from verified source')

  const manifest = {
    schemaVersion: 'urai-private-consumer-staging-artifact-1',
    repository: candidate.repository,
    sourceSha: candidate.sourceSha,
    sourcePullRequest: candidate.sourcePullRequest,
    stagingRepository: candidate.stagingRepository,
    stagingProject: candidate.stagingProject,
    stagingControllerPullRequest: candidate.stagingControllerPullRequest,
    scope: 'offline-real-static-consumer-build-unadmitted',
    productionDeploymentAuthorized: false,
    stagingDeploymentAuthorized: false,
    deployed: false,
    accessRestrictedStagingVerified: false,
    spatialProviderFunctionsVerified: false,
    endToEndAuthenticatedIntegrationVerified: false,
    finalAssetAdmissions: 0,
    files: listing.files,
    fileCount: listing.files.length,
    totalBytes: listing.totalBytes,
    stagingBlockers: [
      'Independent exact-source staging controller review',
      'Authenticated edge access restriction and staging Hosting authority',
      'Staging Spatial provider functions, Auth, Firestore, Storage and secret references',
      'End-to-end authenticated consumer browser verification',
      'Final asset and cinematic admission'
    ]
  }
  fs.writeFileSync(path.join(dst, 'consumer-artifact-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
  // This config is an UNAPPROVED candidate, never the default firebase.json.
  // Existing staging /api/healthz and /api/buildinfo remain staging-owned.
  // Spatial API endpoints are not implicitly routed into production functions.
  const firebaseCandidate = {
    hosting: {
      site: 'urai-staging',
      public: 'public',
      cleanUrls: true,
      trailingSlash: true,
      headers: [{
        source: '**', headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' }
        ]
      }],
      rewrites: [
        { source: '/api/healthz', function: 'healthz' },
        { source: '/api/buildinfo', function: 'buildinfo' }
      ]
    }
  }
  fs.writeFileSync(path.join(dst, 'UNAPPROVED-firebase.consumer-staging.json'), JSON.stringify(firebaseCandidate, null, 2) + '\n', { mode: 0o600 })
  return { manifest, manifestPath: path.join(dst, 'consumer-artifact-manifest.json') }
}

function argumentValue(flag) {
  const at = process.argv.indexOf(flag)
  return at >= 0 ? process.argv[at + 1] : null
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = prepareConsumerStagingBundle({
      spatialExport: argumentValue('--spatial-export'),
      outputDirectory: argumentValue('--out'),
      candidatePath: argumentValue('--candidate') || 'config/spatial-consumer-candidate.json'
    })
    console.log(JSON.stringify({ outcome: 'OFFLINE_SOURCE_ARTIFACT_ONLY', ...result.manifest, files: undefined }, null, 2))
  } catch (error) {
    console.error('Consumer staging assembly rejected: ' + error.message)
    process.exitCode = 1
  }
}
