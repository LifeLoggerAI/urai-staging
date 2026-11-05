import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('./fixtures/r720-public-boundaries/', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
const blobHash = bytes => createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const requireFromFunctions = createRequire(new URL('../functions/package.json',import.meta.url));
const ts = requireFromFunctions('typescript');
let loaded;

function validated() {
  assert.equal(manifest.schemaVersion,'urai-r720-public-denial-v1');
  assert.equal(manifest.environment,'offline-synthetic-only');
  assert.equal(manifest.productionAuthorized,false);
  assert.deepEqual(manifest.claims,{
    providerDeletionAcknowledged:false,privateMediaRendered:false,ruaiTenantAuthorized:false
  });
  assert.deepEqual(manifest.refs,{
    privacy:'dd1697cc04833428d746a3f671a908f2825ee4b6',
    factory:'09fb062643cbad7cd0576fb85bb05d2db97d7d49'
  });
  assert.deepEqual(Object.keys(manifest.sha).sort(),[
    'factory/assetfactory-studio/lib/server/assetProviderAdapters.ts',
    'privacy/functions/src/deletion-contract.ts'
  ]);
  for(const [relative,sha] of Object.entries(manifest.sha)){
    assert.match(relative,/^(factory|privacy)\/[A-Za-z0-9/._-]+$/);
    assert.match(sha,/^[0-9a-f]{40}$/);
    assert.equal(blobHash(readFileSync(join(root,relative))),sha,relative+' original source drift');
  }
}

async function originals() {
  if(loaded) return loaded;
  validated();
  const temp=mkdtempSync(join(tmpdir(),'urai-r720-public-denial-'));
  const paths={
    privacy:'privacy/functions/src/deletion-contract.ts',
    factory:'factory/assetfactory-studio/lib/server/assetProviderAdapters.ts'
  };
  try{
    writeFileSync(join(temp,'package.json'),'{"type":"module"}\n');
    const modules={};
    for(const [key,relative] of Object.entries(paths)){
      const source=readFileSync(join(root,relative),'utf8');
      const output=ts.transpileModule(source,{
        fileName:relative,reportDiagnostics:true,
        compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
      });
      assert.equal((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
      const dest=join(temp,key+'.mjs');
      writeFileSync(dest,output.outputText);
      modules[key]=await import(pathToFileURL(dest).href);
    }
    loaded=modules;
    return modules;
  }finally{
    // Imported modules are retained in memory after temporary files are removed.
    rmSync(temp,{force:true,recursive:true});
  }
}

test('R720 original Git blob manifest remains exact and production-disabled',()=>validated());

test('R720 original Privacy registry refuses forged, omitted, or duplicated RuAi deletion',async()=>{
  const {privacy}=await originals();
  const {DELETION_ADAPTERS,DELETION_MANIFEST_VERSION,deletionSubjectHash,
    deletionExecutionBlockers,canExecuteDeletion}=privacy;
  assert.equal(DELETION_ADAPTERS.filter(x=>x.status==='active').length,3);
  assert.equal(DELETION_ADAPTERS.filter(x=>x.status==='pending').length,8);
  const manifestValue={
    version:DELETION_MANIFEST_VERSION,
    requestId:'r720-synthetic-owner-deletion',
    subjectHash:deletionSubjectHash('r720-synthetic-owner'),
    legalHold:false,
    adapters:DELETION_ADAPTERS.map(x=>({
      adapterId:x.id,system:x.system,status:x.status,
      itemCount:x.status==='active'?0:null
    }))
  };
  const cloned=()=>structuredClone(manifestValue);
  assert.deepEqual(deletionExecutionBlockers(manifestValue),['PENDING_ADAPTERS']);
  assert.equal(canExecuteDeletion(manifestValue),false);
  assert.ok(DELETION_ADAPTERS.some(x=>x.id==='ruai-b2bportal'&&x.status==='pending'));
  assert.ok(DELETION_ADAPTERS.some(x=>x.id==='asset-factory'&&x.status==='pending'));
  const omit=cloned();omit.adapters=omit.adapters.filter(x=>x.adapterId!=='ruai-b2bportal');
  assert.ok(deletionExecutionBlockers(omit).includes('ADAPTER_REGISTRY_MISMATCH'));
  assert.equal(canExecuteDeletion(omit),false);
  const forge=cloned();forge.adapters.find(x=>x.adapterId==='ruai-b2bportal').status='active';
  forge.adapters.find(x=>x.adapterId==='ruai-b2bportal').itemCount=0;
  assert.ok(deletionExecutionBlockers(forge).includes('ADAPTER_REGISTRY_MISMATCH'));
  assert.equal(canExecuteDeletion(forge),false);
  const duplicate=cloned();duplicate.adapters.push(duplicate.adapters[0]);
  assert.ok(deletionExecutionBlockers(duplicate).includes('ADAPTER_REGISTRY_MISMATCH'));
  const replaced=cloned();replaced.adapters.find(x=>x.adapterId==='ruai-b2bportal').system='urai-privacy';
  assert.ok(deletionExecutionBlockers(replaced).includes('ADAPTER_REGISTRY_MISMATCH'));
  const legal=cloned();legal.legalHold=true;
  assert.ok(deletionExecutionBlockers(legal).includes('ACTIVE_LEGAL_HOLD'));
  const wrong=cloned();wrong.version='0.0.0';
  assert.deepEqual(deletionExecutionBlockers(wrong),['INVALID_DELETION_MANIFEST']);
  console.log('R720_RUAI_OMISSION_AND_FORGERY_DENIED');
});

test('R720 local-zero residuals cannot authorize ecosystem-wide completion',async()=>{
  const {privacy}=await originals();
  assert.equal(privacy.deletionEcosystemCompletionBlockReason(),
    'PENDING_DOWNSTREAM_DELETION_CONTRIBUTORS');
  const summary=privacy.deletionAdapterSummary();
  assert.equal(summary.executableCrossSystemDelete,false);
  assert.equal(summary.activeAdapters.length,3);
  assert.equal(summary.pendingAdapters.length,8);
  for(const system of ['ruai-b2bportal','asset-factory','urai-jobs','urai-studio','urai-spatial']){
    assert.ok(summary.pendingAdapters.some(x=>x.id===system),system);
  }
  assert.equal(manifest.claims.providerDeletionAcknowledged,false);
  assert.equal(manifest.claims.ruaiTenantAuthorized,false);
  console.log('R720_GLOBAL_DELETION_COMPLETION_DENIED');
});

const providerKeys=[
  'OPENAI_API_KEY','REPLICATE_API_TOKEN','FAL_KEY','ELEVENLABS_API_KEY',
  'STABILITY_API_KEY','RUNWAY_API_KEY','HIGGSFIELD_API_KEY_ID',
  'HIGGSFIELD_API_KEY_SECRET','ASSET_FACTORY_MEDIA_PROVIDER'
];
function withSyntheticEnvironment(replacements,fn){
  const original=Object.fromEntries(providerKeys.map(k=>[k,process.env[k]]));
  try{
    for(const key of providerKeys) delete process.env[key];
    for(const [key,value] of Object.entries(replacements))process.env[key]=value;
    return fn();
  }finally{
    for(const key of providerKeys){
      if(original[key]===undefined) delete process.env[key];
      else process.env[key]=original[key];
    }
  }
}
test('R720 original Factory has only unverified local proof with no provider keys',async()=>{
  const {factory}=await originals();
  withSyntheticEnvironment({},()=>{
    const d=factory.getProviderDiagnostics();
    assert.equal(d.selected,'local-proof');
    assert.equal(d.selectedConfigured,true);
    assert.equal(d.adapters.length,8);
    assert.ok(d.adapters.filter(x=>x.name!=='local-proof').every(x=>x.configured===false));
    assert.equal(d.adapters.find(x=>x.name==='openai').render,undefined);
    assert.equal(factory.configuredProviderName(),'local-proof');
  });
  withSyntheticEnvironment({ASSET_FACTORY_MEDIA_PROVIDER:'fake-provider'},()=>{
    assert.equal(factory.configuredProviderName(),'local-proof');
  });
  console.log('R720_UNCONFIGURED_FACTORY_PROVIDER_DENIED');
});

test('R720 partial credentials do not satisfy combined Factory provider admission',async()=>{
  const {factory}=await originals();
  withSyntheticEnvironment({ASSET_FACTORY_MEDIA_PROVIDER:'higgsfield',HIGGSFIELD_API_KEY_ID:'synthetic-id-only'},()=>{
    const d=factory.getProviderDiagnostics();
    assert.equal(d.selected,'higgsfield');
    assert.equal(d.selectedConfigured,false);
    assert.ok(d.selectedMissingEnv.includes('HIGGSFIELD_API_KEY_SECRET'));
    assert.equal(d.adapters.find(x=>x.name==='higgsfield').render,undefined);
  });
  withSyntheticEnvironment({ASSET_FACTORY_MEDIA_PROVIDER:'runway'},()=>{
    const d=factory.getProviderDiagnostics();
    assert.equal(d.selected,'runway');
    assert.equal(d.selectedConfigured,false);
    assert.ok(d.selectedMissingEnv.includes('RUNWAY_API_KEY'));
  });
  console.log('R720_PARTIAL_PROVIDER_CREDENTIAL_DENIED');
});

test('R720 provider configuration alone is never a provider execution/deletion receipt',async()=>{
  const {factory,privacy}=await originals();
  withSyntheticEnvironment({ASSET_FACTORY_MEDIA_PROVIDER:'openai',OPENAI_API_KEY:'synthetic-value-not-valid'},()=>{
    const d=factory.getProviderDiagnostics();
    assert.equal(d.selected,'openai');
    assert.equal(d.selectedConfigured,true,'this is configuration only');
    assert.equal(d.adapters.find(x=>x.name==='openai').render,undefined);
    assert.equal(manifest.claims.providerDeletionAcknowledged,false);
    assert.equal(manifest.claims.privateMediaRendered,false);
    assert.notEqual(privacy.deletionEcosystemCompletionBlockReason(),'');
    assert.equal(privacy.deletionAdapterSummary().executableCrossSystemDelete,false);
  });
  console.log('R720_NO_PROVIDER_ACK_FROM_CONFIGURATION');
});
