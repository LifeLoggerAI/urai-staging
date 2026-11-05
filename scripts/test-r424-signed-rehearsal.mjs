import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const fixture = fileURLToPath(new URL('./fixtures/r424-signed/', import.meta.url));
const provenance = JSON.parse(readFileSync(new URL('./fixtures/r424-signed/manifest.json', import.meta.url),'utf8'));
const prefix = Object.freeze({jobs:'urai-jobs',privacy:'urai-privacy',studio:'urai-studio'});
const blobHash = data => createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
function validated() {
  assert.equal(provenance.schemaVersion,'urai-r424-signed-rehearsal-v1');
  assert.equal(provenance.environment,'offline-synthetic-only');
  assert.equal(provenance.productionAuthorized,false);
  assert.deepEqual(provenance.refs,{
    jobs:'ee548bc15d059ec98f2d8bddb004f5ec0df0a5b8',
    privacy:'a8f2cb06a81cea1db714c509170ae6416cb6bb3a',
    studio:'e0e3c9f6de652243f6dd0d34ce5e66c22d5ae1f7'
  });
  assert.equal(Object.keys(provenance.sha).length,20);
  for (const [file,expected] of Object.entries(provenance.sha)) {
    assert.match(file,/^(jobs|privacy|studio)\/[A-Za-z0-9/._-]+$/);
    assert.match(expected,/^[a-f0-9]{40}$/);
    const data=readFileSync(join(fixture,file));
    assert.equal(blobHash(data),expected,'origin Git source changed '+file);
  }
}
test('R424 signed-identity rehearsal exact 20 public original-source blobs',()=>validated());
test('R424 original Jobs Privacy Studio signed-identity rehearsal 18/18, render still off',()=>{
  validated();
  const temporary=mkdtempSync(join(tmpdir(),'urai-r424-integrated-'));
  try{
    for(const file of Object.keys(provenance.sha)){
      const [key,...parts]=file.split('/');
      const dest=join(temporary,prefix[key],...parts);
      mkdirSync(dirname(dest),{recursive:true});
      copyFileSync(join(fixture,file),dest);
    }
    // Historical R421 wrapper pins its own old source hashes literally.
    // Its wrapper is first verified as an ORIGINAL Git blob by validated().
    // Repoint ONLY the three obsolete hash comparisons in a disposable
    // generated copy; all 20 runtime TS source blobs remain unchanged and
    // verified against the latest manifest. No production source is patched.
    const originalRunner=join(temporary,'urai-jobs','scripts','integration','r421-run-synthetic-cross-service.mjs');
    let boundRunner=readFileSync(originalRunner,'utf8');
    const legacyHash={
      'jobs/functions/src/privacy/lifeMovieConsentDecision.ts':'c1e05bf386bd47ff64bec20623cc50f29a9d1aa5',
      'privacy/functions/src/life-movie-scoped-receipt.ts':'a41f4cf9c2efb525115ec31359d936c8b2f66f6e',
      'privacy/functions/src/life-movie-render-authorization.ts':'a75e4f2297c331baa52b044f2842820adbdc7fc8',
    };
    for(const [file,previous] of Object.entries(legacyHash)){
      const expected=provenance.sha[file];
      assert.match(expected,/^[0-9a-f]{40}$/);
      assert.notEqual(expected,previous,'current source must differ from historical pin');
      assert.equal(boundRunner.split(previous).length,2,'R421 wrapper historical pin must occur once');
      boundRunner=boundRunner.replace(previous,expected);
    }
    writeFileSync(originalRunner,boundRunner);
    const jobs=join(temporary,'urai-jobs');
    // Original Jobs runner resolves TypeScript from its Functions package path.
    // Stage only the already-installed test dependency, never production credentials.
    const requireFromStagingFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
    const typescriptPackage = dirname(requireFromStagingFunctions.resolve('typescript/package.json'));
    mkdirSync(join(jobs,'functions/node_modules'), {recursive:true});
    symlinkSync(typescriptPackage,join(jobs,'functions/node_modules/typescript'),'dir');
    const env={PATH:process.env.PATH||'',HOME:process.env.HOME||'/tmp',CI:'1',
      URAI_PRIVACY_ROOT:join(temporary,'urai-privacy'),URAI_STUDIO_ROOT:join(temporary,'urai-studio'),
      NODE_PATH:join(process.cwd(),'functions/node_modules')};
    const result=spawnSync(process.execPath,['scripts/integration/r421-run-synthetic-cross-service.mjs'],{cwd:jobs,env,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
    assert.equal(result.error,undefined,String(result.error));
    assert.equal(result.status,0,'original cross-service rehearsal failed\n'+result.stdout+'\n'+result.stderr);
    assert.match(result.stdout,/# tests 18(?:\r?\n)/);
    assert.match(result.stdout,/# pass 18(?:\r?\n)/);
    assert.match(result.stdout,/# fail 0(?:\r?\n)/);
    assert.match(result.stdout,/R421_SYNTHETIC_REHEARSAL_PASSED/);
  }finally{rmSync(temporary,{force:true,recursive:true})}
});

test('R710 current original Studio bridge caps long project idempotency, preserving all render holds',async()=>{
  validated();
  const filename = 'studio/apps/studio/lib/studio-life-movie-jobs-bridge.ts';
  const code = readFileSync(join(fixture,filename),'utf8');
  assert.equal(blobHash(Buffer.from(code)),provenance.sha[filename]);
  const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
  const ts = requireFromFunctions('typescript');
  const transpiled = ts.transpileModule(code,{
    fileName:filename,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
  });
  assert.equal((transpiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
  const temp = mkdtempSync(join(tmpdir(),'urai-r710-studio-'));
  try {
    writeFileSync(join(temp,'package.json'),'{"type":"module"}\n');
    const out = join(temp,'bridge.mjs');
    writeFileSync(out,transpiled.outputText);
    const {buildJobsLifeMovieEnvelope} = await import(pathToFileURL(out).href);
    const base = projectId => ({
      tenantId:'synthetic-tenant-01',projectId,
      sceneTruthReceiptRef:'str_'+'A'.repeat(16)+'_'+'a'.repeat(8)+'_'+'B'.repeat(40),
      sceneTruthDigest:'c'.repeat(64),
      sources:[{
        id:'synthetic_source_01',bucket:'synthetic-urai-test-bucket',
        objectPath:'studios/synthetic-tenant-01/source.jpg',generation:'123456',
        mimeType:'image/jpeg',provenance:'user-recorded-memory',
        sourceRefs:['synthetic-src-1'],consentRef:'synthetic-consent-ref',
        ownerOrRightsRef:'synthetic-owner-rights'
      }],
      timeline:[{sourceId:'synthetic_source_01',startMs:0,endMs:1000}],
      width:640,height:480,fps:24
    });
    const small = buildJobsLifeMovieEnvelope(base('synthetic-project-01'));
    const long = buildJobsLifeMovieEnvelope(base('p'.repeat(128)));
    const longRepeat = buildJobsLifeMovieEnvelope(base('p'.repeat(128)));
    const otherLong = buildJobsLifeMovieEnvelope(base('q'.repeat(128)));
    assert.match(small.idempotencyKey,/^life-movie:synthetic-project-01:[a-f0-9]{32}$/);
    assert.ok(long.idempotencyKey.length<=160);
    assert.match(long.idempotencyKey,/^life-movie:[a-f0-9]{32}:[a-f0-9]{32}$/);
    assert.equal(long.idempotencyKey,longRepeat.idempotencyKey);
    assert.notEqual(long.idempotencyKey,otherLong.idempotencyKey);
    assert.equal(long.payload.projectId,'p'.repeat(128),'full project identity must not be lost');
    assert.equal(long.dispatchAuthorized,false);
    assert.equal(long.providerGenerationAuthorized,false);
    assert.equal(long.publicReleaseAuthorized,false);
    assert.equal(long.payload.providerGenerationAuthorized,false);
    assert.equal(long.payload.publicReleaseAuthorized,false);
    assert.throws(()=>buildJobsLifeMovieEnvelope(base('p'.repeat(129))),/life_movie_invalid_project/);
    assert.throws(()=>buildJobsLifeMovieEnvelope({...base('synthetic-project-01'),sources:[{...base('synthetic-project-01').sources[0],objectPath:'studios/another-tenant/source.jpg'}]}),/life_movie_source_outside_tenant/);
    console.log('R710_ORIGINAL_STUDIO_IDEMPOTENCY_PASS');
  }finally{rmSync(temp,{force:true,recursive:true})}
});
