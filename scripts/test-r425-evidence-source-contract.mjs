import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('./fixtures/r425-evidence/scripts/', import.meta.url));
const metadata = JSON.parse(readFileSync(new URL('./fixtures/r425-evidence/manifest.json', import.meta.url),'utf8'));
const canonical = Object.freeze({
  'r426-original-source-evidence.mjs':'1ad836d9f04d34c29ecc26cb7c83b07d971705e0',
  'r426-original-source-evidence.test.mjs':'4c01dd0e115a4cf4dbd419da83b667c795e8fc51',
  'r427-evidence-escrow.mjs':'5192840d093546ed1f2c4a8ab04f8c2773272d57',
  'r427-evidence-escrow.test.mjs':'c95a4fc9124e1d903532cdfa9cfe1dda3c6fffe1'
});
function verify() {
  assert.equal(metadata.schemaVersion,'urai-r425-source-evidence-v1');
  assert.equal(metadata.productionAuthorized,false);
  assert.equal(metadata.environment,'synthetic-local-only');
  assert.equal(metadata.repository,'LifeLoggerAI/urai-jobs');
  assert.equal(metadata.commit,'7f3108cebc9fc9a251de24a0632a47a7824f96a4');
  assert.equal(Object.keys(metadata.pins).length,4);
  for (const [name,sha] of Object.entries(canonical)) {
    assert.equal(metadata.pins[name],sha);
    const source=readFileSync(join(root,name));
    const actual=createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex');
    assert.equal(actual,sha,'unexpected original source: '+name);
  }
}
test('R425 original evidence escrow sources match immutable Git blobs',()=>verify());
test('R428 original 16 synthetic escrow and exact-source test cases pass',()=>{
  verify();
  const cp=spawnSync(process.execPath,['--test',
    'r426-original-source-evidence.test.mjs',
    'r427-evidence-escrow.test.mjs'],{
    cwd:root,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,
    env:{PATH:process.env.PATH||'',HOME:process.env.HOME||'/tmp',CI:'1'}
  });
  assert.equal(cp.error,undefined,String(cp.error));
  assert.equal(cp.status,0,'original evidence tests failed:\n'+cp.stdout+'\n'+cp.stderr);
  assert.match(cp.stdout,/# tests 16(?:\r?\n)/);
  assert.match(cp.stdout,/# pass 16(?:\r?\n)/);
  assert.match(cp.stdout,/# fail 0(?:\r?\n)/);
  assert.match(cp.stdout,/# skipped 0(?:\r?\n)/);
});