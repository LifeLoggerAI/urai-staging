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
  write(spatialExport, 'api/system/deploy-proof', JSON.stringify({
    service:'urai-spatial-deploy-proof',repository:candidate.repository,
    deploymentFreshness:{ commitSha:candidate.sourceSha }
  }))
  write(spatialExport, 'static-launch-boundary.json', JSON.stringify({
    releaseClassification:'NO-GO',sourceSha:candidate.sourceSha,
    providerActivation:false,deviceAcceptance:false,
    routes:[{route:'/xr',enabled:false},{route:'/spatial/ar-vr',enabled:false}]
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
  runFixture(f => { f.candidate.sourceSha='f'.repeat(40);fs.writeFileSync(f.candidatePath,JSON.stringify(f.candidate));assert.throws(()=>prepareConsumerStagingBundle(f),/does not match pinned/) })
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
    assert.throws(()=>prepareConsumerStagingBundle(f),/not fail-closed/)
  })
})
