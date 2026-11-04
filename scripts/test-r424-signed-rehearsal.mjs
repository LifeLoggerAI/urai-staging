import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    jobs:'ce85730f0ce51297b317c2d3f082f859ade4459a',
    privacy:'e6d71fd19f0f74d3d39e11b8716d5b868565d304',
    studio:'d1f30d2a8eca28b7474bcf43f0b8118d0f826a21'
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
