import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { verifyFixtureProvenance } from './r747-verify-federated-fixtures.mjs';

const hash = content => { const bytes=Buffer.from(content); return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'); };
const forty = 'a'.repeat(40);
const locations = {
  r422: 'scripts/fixtures/r422-federated', r423: 'scripts/fixtures/r423-worker',
  r424: 'scripts/fixtures/r424-signed', r425: 'scripts/fixtures/r425-evidence',
};
function makeFile(root, relative, content) {
  const path = join(root, relative); mkdirSync(dirname(path), { recursive:true }); writeFileSync(path, content);return hash(content);
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'r747-'));
  let m422 = {schemaVersion:'urai-r422-federated-source-abi-v1',environment:'offline-synthetic-only',productionAuthorized:false,entries:[]};
  for(let i=0;i<6;i++) {const id=`fixture${i}`;const blob=makeFile(root,`${locations.r422}/${id}.ts`,`export const n = ${i};\n`); m422.entries.push({id,blob,repository:'LifeLoggerAI/urai-jobs',path:`functions/src/${id}.ts`,commit:forty}); }
  let m423 = {schemaVersion:'urai-r423-worker-source-fence-v1',environment:'synthetic-offline-only',productionAuthorized:false,consumer:'LifeLoggerAI/urai-jobs',commit:forty,files:[]};
  for(let i=0;i<3;i++){const path=`work${i}/source.js`;m423.files.push({path,sha:makeFile(root,`${locations.r423}/${path}`,`export const n=${i};\n`)});}
  let m424 = {schemaVersion:'urai-r424-signed-rehearsal-v1',environment:'offline-synthetic-only',productionAuthorized:false,refs:{jobs:forty,privacy:forty,studio:forty},sha:{}};
  for(let i=0;i<20;i++){const path=`jobs/src/file${i}.ts`;m424.sha[path]=makeFile(root,`${locations.r424}/${path}`,`export const n=${i};\n`);}
  let m425 = {schemaVersion:'urai-r425-source-evidence-v1',environment:'synthetic-local-only',productionAuthorized:false,repository:'LifeLoggerAI/urai-jobs',commit:forty,pins:{}};
  for(let i=0;i<4;i++){const path=`receipt${i}.mjs`;m425.pins[path]=makeFile(root,`${locations.r425}/scripts/${path}`,`export const n=${i};\n`);}
  const ms = [m422,m423,m424,m425], dirs=Object.values(locations);
  ms.forEach((m,i) => makeFile(root,`${dirs[i]}/manifest.json`,JSON.stringify(m)+'\n'));
  const mutate = (n,fn) => {const path=join(root,`${dirs[n]}/manifest.json`);const m=JSON.parse(readFileSync(path,'utf8'));fn(m);writeFileSync(path,JSON.stringify(m)+'\n');};
  return {root,ms,mutate,finish:()=>rmSync(root,{recursive:true,force:true})};
}
function caseTest(name, alteration, pattern){test(name,()=>{const f=fixture();try{alteration(f);assert.throws(()=>verifyFixtureProvenance(f.root),pattern);}finally{f.finish();}});}
test('R747 clean 33 fixtures pass without npm, Firebase or GitHub',()=>{const f=fixture();try{const r=verifyFixtureProvenance(f.root);assert.equal(r.verified,33);assert.deepEqual(r.checks.map(x=>x.verified),[6,3,20,4]);assert.equal(r.productionAuthorized,false);}finally{f.finish();}});
caseTest('R747 missing fixture fails closed',f=>unlinkSync(join(f.root,locations.r422,'fixture0.ts')),/ENOENT/);
caseTest('R747 tampered source bytes rejected',f=>writeFileSync(join(f.root,locations.r423,'work0/source.js'),'changed'),/fixture changed/);
caseTest('R747 malformed pin count rejected',f=>f.mutate(2,m=>delete m.sha['jobs/src/file0.ts']),/pin count drift/);
caseTest('R747 production authorization flag rejected',f=>f.mutate(3,m=>m.productionAuthorized=true),/production flag/);
caseTest('R747 unsafe traversal path rejected',f=>f.mutate(1,m=>m.files[0].path='../../outside'),/unsafe fixture path|fixture escapes source root/);
caseTest('R747 duplicate manifest entry rejected',f=>f.mutate(0,m=>m.entries[1]={...m.entries[0]}),/repeated path/);
caseTest('R747 wrong manifest schema rejected',f=>f.mutate(2,m=>m.schemaVersion='wrong'),/schema drift/);
caseTest('R747 malformed expected blob hash rejected',f=>f.mutate(3,m=>m.pins['receipt0.mjs']='not-a-hash'),/expected Git blob invalid/);
caseTest('R747 symlink fixture rejected',f=>{const path=join(f.root,locations.r425,'scripts/receipt0.mjs');unlinkSync(path);symlinkSync('receipt1.mjs',path);},/untrusted fixture type/);
caseTest('R747 forged environment label rejected',f=>f.mutate(0,m=>m.environment='production'),/environment drift/);
