import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=new URL('../src/syntheticMemoryLifecycle.ts',import.meta.url);
const usedProcess={env:{GCLOUD_PROJECT:'urai-staging-test',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}};
function setup({nodes=0}={}){
 const uid='owner-synthetic',receipt='synthetic_receipt_1234567890ABCDEF';
 const graphBase=`staging_synthetic_life_graph/${uid}/nodes`;
 const consentPath=`staging_synthetic_memory_consents/${uid}`;
 const records=new Map([[consentPath,{ownerUid:uid,purpose:'memory.storage',policyVersion:'urai-staging-synthetic-lifecycle-v1',status:'granted',decisionReceiptId:receipt,expiresAtMillis:Date.now()+600000}]]);
 for(let i=0;i<nodes;i++)records.set(`${graphBase}/synthetic${i}`,{memoryId:`synthetic${i}`,state:'ACTIVE',synthetic:true});
 const storage=new Map();let next=0;const calls={queryReads:0,consentUpdates:0,cleanups:0};
 const snapshot=(path)=>{let row=records.get(path);return{exists:!!row,data:()=>row,get:k=>row?.[k]}};
 class DocumentRef{
  constructor(path){this.path=path;this.id=path.split('/').at(-1)}
  collection(name){return new CollectionRef(`${this.path}/${name}`)}
  get(){return Promise.resolve(snapshot(this.path))}
  update(obj){records.set(this.path,{...records.get(this.path),...obj});return Promise.resolve()}
 }
 class CollectionRef{
  constructor(path){this.path=path}
  doc(id){return new DocumentRef(`${this.path}/${id??`newsynthetic${next++}`}`)}
  limit(n){return {path:this.path,limit:n,kind:'query'}}
 }
 const db={doc:path=>new DocumentRef(path),collection:path=>new CollectionRef(path),runTransaction:fn=>fn({
  get:async ref=>{if(ref.kind==='query'){calls.queryReads++;return{size:[...records.keys()].filter(k=>k.startsWith(ref.path+'/')).length>ref.limit?ref.limit:[...records.keys()].filter(k=>k.startsWith(ref.path+'/')).length}}return snapshot(ref.path)},
  create:(ref,data)=>{assert.ok(!records.has(ref.path));records.set(ref.path,data)},
  update:(ref,data)=>{calls.consentUpdates++;records.set(ref.path,{...records.get(ref.path),...data})},
 })};
 const getStorage=()=>({bucket:()=>({file:path=>({save:async bytes=>{storage.set(path,bytes)},delete:async()=>{calls.cleanups++;storage.delete(path)},download:async()=>[storage.get(path)]})})});
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const exports={};const source=fs.readFileSync(root,'utf8');const compiled=ts.transpileModule(source,{fileName:'syntheticMemoryLifecycle.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const context={exports,module:{exports},Buffer,process:usedProcess,Date,Set,Map,Promise,Error,Number,Object,String,Array,RegExp,console,require:name=>{
  if(name==='node:crypto')return require('node:crypto');
  if(name==='firebase-functions/v1')return {https:{onCall:x=>x,HttpsError}};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>db,FieldValue:{serverTimestamp:()=>'',increment:x=>x}};
  if(name==='firebase-admin/storage')return {getStorage};
  if(name==='./lib/auth')return {requireAuth:ctx=>({uid:ctx.auth.uid})};
  if(name==='./lib/validation')return {assertPlainObject:x=>x,requiredString:x=>String(x)};
  throw Error('UNKNOWN_IMPORT '+name);
 }};
 vm.runInNewContext(compiled,context,{timeout:3000});
 return{app:exports,records,storage,uid,receipt,calls,graphBase,consentPath};
}

test('synthetic graph at 127 nodes accepts exactly one more',async()=>{
 const s=setup({nodes:127});const result=await s.app.createStagingSyntheticMemory({decisionReceiptId:s.receipt},{auth:{uid:s.uid}});
 assert.equal(result.ownerUid,s.uid);assert.equal([...s.records.keys()].filter(p=>p.startsWith(s.graphBase+'/')).length,128);
 assert.equal(s.storage.size,1);
});

test('synthetic graph at 128 nodes refuses new creation and cleans prewritten object',async()=>{
 const s=setup({nodes:128});
 await assert.rejects(s.app.createStagingSyntheticMemory({decisionReceiptId:s.receipt},{auth:{uid:s.uid}}),e=>e.code==='permission-denied'&&/SYNTHETIC_GRAPH_CAPACITY_EXCEEDED/.test(e.message));
 assert.equal([...s.records.keys()].filter(p=>p.startsWith(s.graphBase+'/')).length,128);
 assert.equal(s.storage.size,0);
 assert.equal(s.calls.cleanups,1);
});

test('creation transaction serializes per-user consent record to prevent capacity races',async()=>{
 const s=setup({nodes:127});await s.app.createStagingSyntheticMemory({decisionReceiptId:s.receipt},{auth:{uid:s.uid}});
 assert.equal(s.calls.consentUpdates,1);
 assert.equal(s.records.get(s.consentPath).syntheticGraphNodeCount,128);
});
