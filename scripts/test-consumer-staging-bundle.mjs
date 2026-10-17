import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { prepareConsumerStagingBundle } from './prepare-consumer-staging-bundle.mjs'

const pages = [
  'index.html','home/index.html','ascent/index.html','life-map/index.html',
  'focus/index.html','replay/index.html','unwind/index.html','login/index.html',
  'privacy-controls/index.html','privacy-policy/index.html','support/index.html'
]
function write(root, name, content) {
  const target = path.join(root, ...name.split('/'))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-consumer-staging-'))
  const spatialExport = path.join(root, 'actual-spatial-out')
  const outputDirectory = path.join(root, 'unadmitted-artifact')
  const candidatePath = path.join(root, 'candidate.json')
  const candidate = JSON.parse(fs.readFileSync(new URL('../config/spatial-consumer-candidate.json', import.meta.url), 'utf8'))
  fs.mkdirSync(spatialExport)
  for (const page of pages) write(spatialExport, page, '<!doctype html><html><body>UrAi compiled static route</body></html>')
  write(spatialExport, '_next/static/chunks/app.js', '/* synthetic compiled JS marker */')
  const proof = JSON.stringify({
    service:'urai-spatial-deploy-proof',repository:candidate.repository,
    claimBoundaries:{webxr:'governed-post-launch-gated'},
    deploymentFreshness:{ commitSha:candidate.sourceSha }
  })
  write(spatialExport, 'api/system/deploy-proof', proof)
  write(spatialExport, 'static-launch-boundary.json', JSON.stringify({
    releaseClassification:'NO-GO',sourceSha:candidate.sourceSha,
    compiledProofSha256:createHash('sha256').update(proof).digest('hex'),
    providerActivation:false,deviceAcceptance:false,
    routes:[
      {route:'/xr',enabled:false,expectedStatus:404,previewOnly:false},
      {route:'/spatial/ar-vr',enabled:false,expectedStatus:200,previewOnly:true}
    ]
  }))
  fs.writeFileSync(candidatePath, JSON.stringify(candidate))
  return {root,spatialExport,outputDirectory,candidatePath,candidate}
}
function runFixture(fn) {
  const f=fixture()
  try { fn(f) } finally { fs.rmSync(f.root,{recursive:true,force:true}) }
}

test('assembles real route-shaped consumer bytes without mutating staging public, reviews or live services', () => runFixture(f => {
  const output=prepareConsumerStagingBundle(f)
  assert.equal(output.manifest.sourceSha,f.candidate.sourceSha)
  assert.deepEqual(output.manifest.sourceArtifact,f.candidate.sourceArtifact)
  assert.equal(output.manifest.fileCount,pages.length+3)
  assert.equal(output.manifest.deployed,false)
  assert.equal(output.manifest.stagingDeploymentAuthorized,false)
  assert.equal(output.manifest.accessRestrictedStagingVerified,false)
  assert.equal(output.manifest.finalAssetAdmissions,0)
  assert.equal(fs.readFileSync(path.join(f.outputDirectory,'public/home/index.html'),'utf8'),
    fs.readFileSync(path.join(f.spatialExport,'home/index.html'),'utf8'))
  const entry=output.manifest.files.find(x=>x.path==='home/index.html')
  assert.equal(entry.sha256,createHash('sha256').update(fs.readFileSync(path.join(f.spatialExport,'home/index.html'))).digest('hex'))
  const firebase=JSON.parse(fs.readFileSync(path.join(f.outputDirectory,'UNAPPROVED-firebase.consumer-staging.json'),'utf8'))
  assert.equal(firebase.hosting.site,'urai-staging')
  assert.equal(firebase.hosting.public,'public')
  assert.ok(!firebase.hosting.rewrites.some(x=>x.source==='**'||x.source==='/api/urai/council/anthropic'))
  assert.equal(fs.existsSync(path.join(f.root,'public')),false)
  assert.throws(()=>prepareConsumerStagingBundle(f),/already exists/)
}))

test('rejects fabricated or incomplete static build and mismatched source identities', () => {
  runFixture(f => { fs.rmSync(path.join(f.spatialExport,'replay/index.html'));assert.throws(()=>prepareConsumerStagingBundle(f),/route missing/) })
  runFixture(f => { f.candidate.sourceSha='f'.repeat(40);fs.writeFileSync(f.candidatePath,JSON.stringify(f.candidate));assert.throws(()=>prepareConsumerStagingBundle(f),/Unapproved consumer or asset authority/) })
  runFixture(f => { f.candidate.independentReviewApproved=true;fs.writeFileSync(f.candidatePath,JSON.stringify(f.candidate));assert.throws(()=>prepareConsumerStagingBundle(f),/Unapproved consumer/) })
  runFixture(f => { fs.rmSync(path.join(f.spatialExport,'_next'),{recursive:true,force:true});assert.throws(()=>prepareConsumerStagingBundle(f),/Next.js JavaScript/) })
})

test('rejects private credentials, links and XR disclosure while preserving original source', () => {
  runFixture(f => { write(f.spatialExport,'.env.production','FAKE_PRIVATE_TOKEN');assert.throws(()=>prepareConsumerStagingBundle(f),/secret file/) })
  runFixture(f => { fs.symlinkSync(path.join(f.spatialExport,'index.html'),path.join(f.spatialExport,'linked.html'));assert.throws(()=>prepareConsumerStagingBundle(f),/symlink denied/) })
  runFixture(f => { write(f.spatialExport,'xr/index.html','forbidden disabled route');assert.throws(()=>prepareConsumerStagingBundle(f),/Disabled XR route/) })
  runFixture(f => {
    write(f.spatialExport,'static-launch-boundary.json',JSON.stringify({
      releaseClassification:'GO',sourceSha:f.candidate.sourceSha,
      providerActivation:true,deviceAcceptance:true,routes:[]
    }))
    assert.throws(()=>prepareConsumerStagingBundle(f),/Compiled deployment proof hash differs from gated source authority/)
  })
})


test('disabled XR entries are physically withheld from Hosting public while preserving public fallback art', () => runFixture(f => {
  write(f.spatialExport, 'xr/navmeshes/home-platform-v1.json', '{"protected":true}')
  write(f.spatialExport, 'spatial/ar-vr/internal-room.json', '{"protected":true}')
  write(f.spatialExport, 'assets/urai/xr/ar/unsupported-fallback.webp', 'public-accessible-illustration')
  write(f.spatialExport, 'api/xr/signaling', '{"serverRelayAvailable":false}')
  const result = prepareConsumerStagingBundle(f)
  assert.equal(result.manifest.fileCount, pages.length + 7)
  assert.equal(result.manifest.servedFileCount, pages.length + 5)
  assert.deepEqual(result.manifest.restrictedStaticPrefixes, ['/xr/', '/spatial/ar-vr/'])
  assert.deepEqual(result.manifest.withheldFiles.map(x => x.path).sort(), ['spatial/ar-vr/internal-room.json', 'xr/navmeshes/home-platform-v1.json'])
  for (const item of result.manifest.withheldFiles) {
    assert.equal(fs.existsSync(path.join(f.outputDirectory, 'public', item.path)), false)
    assert.ok(fs.existsSync(path.join(f.spatialExport, item.path)), 'source material must remain unmodified')
  }
  assert.equal(fs.existsSync(path.join(f.outputDirectory, 'public/xr')), false)
  assert.ok(fs.existsSync(path.join(f.outputDirectory, 'public/assets/urai/xr/ar/unsupported-fallback.webp')))
  assert.ok(fs.existsSync(path.join(f.outputDirectory, 'public/api/xr/signaling')))
  const candidate = JSON.parse(fs.readFileSync(path.join(f.outputDirectory, 'UNAPPROVED-firebase.consumer-staging.json')))
  assert.ok(candidate.hosting.rewrites.every(x => x.source !== '**' && !x.source.startsWith('/xr')))
}))

test('real source-side technical preview is withheld from native staging public', () => runFixture(f => {
  write(f.spatialExport, 'spatial/ar-vr/index.html', '<!doctype html><title>Disabled technical preview</title>')
  write(f.spatialExport, 'spatial/ar-vr/index.txt', 'preview without immersive WebXR authority')
  const output = prepareConsumerStagingBundle(f)
  assert.deepEqual(output.manifest.withheldFiles.map(x => x.path).sort(),
    ['spatial/ar-vr/index.html', 'spatial/ar-vr/index.txt'])
  assert.equal(fs.existsSync(path.join(f.outputDirectory, 'public/spatial/ar-vr/index.html')), false)
  assert.equal(output.manifest.deployed, false)
  assert.equal(output.manifest.stagingDeploymentAuthorized, false)
}))

test('reject changed export digest and activated XR technical preview', () => {
  runFixture(f => {
    f.candidate.sourceArtifact.zipSha256 = 'f'.repeat(64)
    fs.writeFileSync(f.candidatePath, JSON.stringify(f.candidate))
    assert.throws(() => prepareConsumerStagingBundle(f), /Unapproved consumer or asset authority/)
  })
  runFixture(f => {
    const file = path.join(f.spatialExport, 'static-launch-boundary.json')
    const boundary = JSON.parse(fs.readFileSync(file))
    boundary.routes[1].enabled = true
    fs.writeFileSync(file, JSON.stringify(boundary))
    assert.throws(() => prepareConsumerStagingBundle(f), /Unapproved immersive XR preview authority/)
  })
})

test('XR staging packaging fails closed on activated or malformed route governance', () => {
  runFixture(f => {
    const file = path.join(f.spatialExport, 'static-launch-boundary.json')
    const boundary = JSON.parse(fs.readFileSync(file))
    boundary.routes[0].enabled = true
    fs.writeFileSync(file, JSON.stringify(boundary))
    assert.throws(() => prepareConsumerStagingBundle(f), /Both gated XR entry directories/)
  })
  runFixture(f => {
    const file = path.join(f.spatialExport, 'static-launch-boundary.json')
    const boundary = JSON.parse(fs.readFileSync(file))
    boundary.routes[0].route = '/xr/../private'
    fs.writeFileSync(file, JSON.stringify(boundary))
    assert.throws(() => prepareConsumerStagingBundle(f), /Unsafe disabled static route prefix/)
  })
})
