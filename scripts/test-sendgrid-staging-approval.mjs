import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { verifyStagingApproval } from './verify-sendgrid-staging-approval.mjs';
const sha='a'.repeat(40);
const pr={state:'open',draft:false,head:{sha,repo:{full_name:'LifeLoggerAI/urai-staging'}},user:{login:'LifeLoggerAI'},updated_at:'stable'};
const review={id:101,state:'APPROVED',commit_id:sha,user:{login:'LimberNutz0',type:'User'}};
const workflows=[['CI','ci.yml'],['URAI Production Verify','urai-production-verify.yml']].map(([name,file],i)=>({id:200+i,name,path:'.github/workflows/'+file,head_sha:sha,status:'completed',conclusion:'success'}));
function fixture({reviews=[review],runs=workflows,threads=[{isResolved:true}],mutatePR=false,pagedReviews=false,pagedThreads=false,permission='write'}={}) {
  let prCalls=0;
  return async(path,body)=>{
    if(path.endsWith('/collaborators/LimberNutz0/permission'))return {permission};
    if(path.endsWith('/pulls/59')){prCalls++;return {...pr,...(mutatePR&&prCalls>1?{head:{...pr.head,sha:'b'.repeat(40)}}:{})};}
    if(path.includes('/reviews?')){
      if(pagedReviews && path.endsWith('page=1'))return Array.from({length:100},(_,i)=>({id:i,state:'COMMENTED',user:{login:'other'}}));
      return reviews;
    }
    if(path==='/graphql')return {data:{repository:{pullRequest:{reviewThreads:{nodes:pagedThreads&&!body.variables.cursor?[{isResolved:true}]:threads,pageInfo:{hasNextPage:pagedThreads&&!body.variables.cursor,endCursor:'next'}}}}}};
    if(path.includes('/actions/runs?'))return {total_count:runs.length,workflow_runs:runs};
    throw Error('Unexpected path '+path);
  };
}
const verify=options=>verifyStagingApproval({sha,prNumber:59,api:fixture(options)});
test('accepts current human native decision with complete checks and threads',async()=>assert.equal((await verify()).reviewId,101));
test('reads review and thread successor pages',async()=>assert.equal((await verify({pagedReviews:true,pagedThreads:true})).reviewId,101));
test('rejects unresolved thread on a later page',async()=>assert.rejects(verify({pagedThreads:true,threads:[{isResolved:false}]}),/Unresolved/));
test('rejects predecessor approval',async()=>assert.rejects(verify({reviews:[{...review,commit_id:'b'.repeat(40)}]}),/exact-head/));
test('rejects later changes requested or dismissed decision',async()=>{for(const state of ['CHANGES_REQUESTED','DISMISSED'])await assert.rejects(verify({reviews:[review,{...review,id:102,state}]}),/APPROVED/);});
test('does not let COMMENTED replace a valid decision',async()=>assert.equal((await verify({reviews:[review,{...review,id:102,state:'COMMENTED'}]})).reviewId,101));
test('rejects bot review and missing review',async()=>{await assert.rejects(verify({reviews:[{...review,user:{login:'LimberNutz0',type:'Bot'}}]}),/human/);await assert.rejects(verify({reviews:[]}),/APPROVED/);});
test('latest queued, cancelled, skipped or failed run supersedes old success',async()=>{for(const conclusion of [null,'cancelled','skipped','failure'])await assert.rejects(verify({runs:[...workflows,{...workflows[0],id:999,status:conclusion?'completed':'queued',conclusion}]}),/CI is not SUCCESS/);});
test('rejects missing required workflow or wrong path',async()=>{await assert.rejects(verify({runs:workflows.slice(0,1)}),/Verify/);await assert.rejects(verify({runs:workflows.map(x=>({...x,path:'.github/workflows/spoof.yml'}))}),/CI/);});
test('rejects head movement during preflight',async()=>assert.rejects(verify({mutatePR:true}),/executing source/));
test('fails closed if GitHub metadata is inaccessible',async()=>assert.rejects(verifyStagingApproval({sha,prNumber:59,api:async()=>{throw Error('403');}}),/403/));
test('requires full Actions pagination',async()=>{
  let pages=0;
  const base=fixture();
  const api=async(path,body)=>{
    if(!path.includes('/actions/runs?'))return base(path,body);
    pages++;
    return pages===1?{total_count:102,workflow_runs:Array.from({length:100},(_,id)=>({id,name:'Other',head_sha:sha}))}:{total_count:102,workflow_runs:workflows};
  };
  assert.equal((await verifyStagingApproval({sha,prNumber:59,api})).sha,sha);
  assert.equal(pages,2);
});


test('workflow enforces approval before WIF and every provider mutation',()=>{
  const source=fs.readFileSync('.github/workflows/communications-pr58-sendgrid-staging-e2e.yml','utf8');
  const gate=source.indexOf('run: |\n          test "$(git rev-parse HEAD)" = "$GITHUB_SHA"');
  assert.ok(gate>0);
  assert.ok(source.indexOf('node scripts/verify-sendgrid-staging-approval.mjs',gate)<source.indexOf('- name: Authenticate WIF'));
  for(const step of ['Authenticate WIF','Resolve SendGrid API key','Prove SendGrid webhook capacity','Enable signed webhook','Deploy exact signed callback'])assert.ok(source.indexOf('- name: '+step)>gate,step);
  assert.match(source,/pull-requests: read/);
  assert.doesNotMatch(source,/pull-requests: write/);
});

test('denies insufficient or unknown reviewer permission',async()=>{
  for(const permission of [null,undefined,'none','read','triage'])await assert.rejects(verify({permission:permission??null}),/permission is insufficient or unknown/);
});
test('accepts governed write maintain or admin reviewer eligibility',async()=>{
  for(const permission of ['write','maintain','admin'])assert.equal((await verify({permission})).reviewer,'LimberNutz0');
});
