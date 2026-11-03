import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const ts=require('typescript');
const files=JSON.parse(fs.readFileSync(new URL('./fixtures/r422-federated/manifest.json',import.meta.url),'utf8'));
assert.equal(files.schemaVersion,'urai-r422-federated-source-abi-v1');
assert.equal(files.productionAuthorized,false);
assert.equal(files.entries.length,6);
const lookup=Object.fromEntries(files.entries.map(e=>[e.id,e]));
function original(id){
 const entry=lookup[id];assert.ok(entry);
 const bytes=fs.readFileSync(new URL('./fixtures/r422-federated/'+id+'.ts',import.meta.url));
 const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(digest,entry.blob,'pinned source changed: '+id);
 assert.match(entry.commit,/^[a-f0-9]{40}$/);
 return bytes.toString('utf8');
}
function moduleOf(id){
 const exports={},source=original(id);
 const compiled=ts.transpileModule(source,{fileName:id+'.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const context={exports,module:{exports},require:name=>{
   if(name==='node:crypto')return require('node:crypto');
   if(name==='firebase-admin/firestore')return{getFirestore:()=>{throw Error('NO_REAL_DB')}};
   if(name==='server-only')return{};
   if(name==='./studio-life-movie-longform-contract')return{readStudioLongformJson:()=>{throw Error('UNUSED')}};
   throw Error('UNEXPECTED_IMPORT '+name);
 },Buffer,Date,Object,Array,Set,String,Error,RegExp,Number,Reflect,Promise,URL,URLSearchParams,AbortSignal,fetch:()=>{throw Error('NETWORK_FORBIDDEN')},process:{env:{}}};
 vm.runInNewContext(compiled.outputText,context,{timeout:2500});
 return exports;
}
const privacy=moduleOf('privacy'),jobs=moduleOf('jobs'),order=moduleOf('order'),gate=moduleOf('gate'),studio=moduleOf('studio'),spatial=moduleOf('spatial');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const uid='synthetic-owner',purpose='life-movie.render',tier='C6',policyVersion='1.1.0';
const recordId=uid+'_'+purpose.replace(/[^a-zA-Z0-9_-]/g,'_'),sourceReceiptHash='a'.repeat(64);
const eventId=hash({schemaVersion:'consent.revoked.v1',recordId,uid,purpose,consentTier:tier,policyVersion,receiptHash:sourceReceiptHash});
const originalRecord={schemaVersion:'consent.revoked.v1',status:'pending',eventId,consentRecordId:recordId,uid,purpose,consentTier:tier,policyVersion,sourceReceiptHash,integrityHash:hash({eventId,recordId,uid,purpose}),createdAt:{toDate:()=>new Date('2026-11-03T09:00:00.000Z')}};
const event=privacy.buildJobsRevocationEventV2(eventId,originalRecord);
function reply(e,extra={}){
 return{ok:true,acknowledgement:{consumerId:'urai-jobs',eventType:e.type,eventId:e.eventId,ownerUid:e.ownerUid,purpose:e.purpose,policyVersion:e.policyVersion,sourceReceiptHash:e.sourceReceiptHash,correlationId:e.correlationId,revokedAt:e.revokedAt,status:'blocked',integrityHash:jobs.canonicalSourceRevocationAckHash({...e,status:'blocked'}),derivativeInvalidation:{purpose:e.purpose,jobsScanned:0,jobsInvalidated:0,plansInvalidated:0,storageObjectsDeleted:0},...extra}};
}
const memory={memoryId:'memory-1',manifestId:'manifest-1',authorizedOwner:true,demo:false};
const query='memoryId=memory-1&manifestId=manifest-1&movieId=movie-1&lifeMoviePlanId=lmp_01234567890123456789012345';
test('original pinned Privacy outbox maps into Jobs v2 envelope',()=>{assert.equal(event.type,'consent.revoked.v2');assert.equal(event.ownerUid,uid);assert.equal(event.correlationId,'revocation:'+eventId)});
test('original independent Privacy/Jobs acknowledgement digests agree',()=>{assert.equal(privacy.jobsRevocationAckHash(event),jobs.canonicalSourceRevocationAckHash({...event,status:'blocked'}));assert.equal(privacy.verifyJobsRevocationResponse(event,reply(event)),true)});
test('modified identity and fake cleanup are denied by original Privacy verifier',()=>{assert.equal(privacy.verifyJobsRevocationResponse(event,reply(event,{ownerUid:'forged'})),false);assert.equal(privacy.verifyJobsRevocationResponse(event,reply(event,{derivativeInvalidation:{purpose,jobsScanned:0,jobsInvalidated:1,plansInvalidated:0,storageObjectsDeleted:0}})),false)});
test('original Jobs ordering vetoes stale and cross-owner revocation',()=>{const existing={active:true,ownerUid:uid,purpose,eventId,revokedAt:'2026-11-03T10:00:00.000Z'};assert.equal(order.mayApplyNewConsentRevocation(true,existing,event),false);assert.equal(order.mayApplyNewConsentRevocation(true,existing,{...event,ownerUid:'forged',revokedAt:'2026-11-03T11:00:00.000Z'}),false)});
test('original Jobs block fence denies revoked or malformed evidence',()=>{assert.throws(()=>jobs.assertJobConsentBlockClear({exists:true,data:()=>({active:true})},'revoked'),/revoked/);assert.throws(()=>jobs.assertJobConsentBlockClear({exists:true,data:()=>({active:'false'})},'revoked'),/life_movie_consent_block_unverified/)});
test('original Jobs rendering authority is hard-closed',()=>{assert.equal(gate.lifeMovieConsentAuthorityAvailable(),false);assert.equal(gate.deferLifeMovieJob({type:'studio.render.video'}),true);assert.equal(gate.deferLifeMovieJob({type:'studio.assemble.video'}),true)});
test('original Studio validates exact render consent, rejects extra fields',()=>{assert.equal(studio.requireStudioJobsRenderConsent({purpose,policyVersion,decisionReceiptId:'b'.repeat(64)}).purpose,purpose);assert.throws(()=>studio.requireStudioJobsRenderConsent({purpose,policyVersion,decisionReceiptId:'b'.repeat(64),admin:true}),/life_movie_invalid_render_consent/)});
test('original Studio refuses accessor-derived receipt authority',()=>{const bad={purpose,policyVersion};Object.defineProperty(bad,'decisionReceiptId',{get(){throw Error('should-not-run')},enumerable:true});assert.throws(()=>studio.requireStudioJobsRenderConsent(bad),/life_movie_invalid_render_consent/)});
test('original Spatial forwards only selected owner nondemo route',()=>{assert.equal(spatial.readPrivateMovieRouteSelection(new URLSearchParams(query),memory).movieId,'movie-1');assert.equal(spatial.readPrivateMovieRouteSelection(new URLSearchParams(query),{...memory,demo:true}),null);assert.equal(spatial.readPrivateMovieRouteSelection(new URLSearchParams(query),{...memory,authorizedOwner:false}),null)});
test('original Spatial rejects duplicate selectors and URL does not grant consent',()=>{assert.equal(spatial.readPrivateMovieRouteSelection(new URLSearchParams(query+'&movieId=forged'),memory),null);assert.equal(gate.lifeMovieConsentAuthorityAvailable(),false)});
test('original Privacy transport denies wrong host without network',async()=>{let sent=0;await assert.rejects(privacy.sendJobsRevocationEvent(event,{endpoint:'https://evil.invalid/ingestConsentRevocation',expectedHost:'evil.invalid',bearerToken:'x'.repeat(64),request:async()=>{sent++;throw Error('FORBIDDEN')}}));assert.equal(sent,0)});
test('original Privacy transport checks Jobs digest through mocked pinned endpoint',async()=>{let sent=0;const result=await privacy.sendJobsRevocationEvent(event,{endpoint:'https://us-central1-urai-jobs.cloudfunctions.net/ingestConsentRevocation',expectedHost:'us-central1-urai-jobs.cloudfunctions.net',bearerToken:'x'.repeat(64),request:async(_url,init)=>{sent++;assert.equal(JSON.parse(init.body).eventId,eventId);return{ok:true,status:200,headers:{get:k=>k==='content-type'?'application/json':null},text:async()=>JSON.stringify(reply(event))}}});assert.equal(sent,1);assert.equal(result.acknowledgementHash,privacy.jobsRevocationAckHash(event))});
