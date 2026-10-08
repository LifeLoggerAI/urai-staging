import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controller,sourceProfile,verifyCanonicalPolicy,verifyStagingVerificationBinding,checkRetainedBinding } from './verify-staging-verification-binding.mjs';

const sha='a'.repeat(40);
const policy=JSON.parse(fs.readFileSync('config/staging-consumers.json','utf8'));
const pr={ state:'open',draft:false,head:{sha,ref:controller.branch,repo:{full_name:controller.repository}},
  base:{ref:controller.base,repo:{full_name:controller.repository}},user:{login:'LifeLoggerAI'},updated_at:'stable' };
const review={id:101,state:'APPROVED',commit_id:sha,user:{login:'LimberNutz0',type:'User'}};
function fixture({update=()=>{},reviewer='LimberNutz0',permission='write'}={}) {
  return async(route)=>{
    if(route.endsWith('/pulls/109')){const value=structuredClone(pr);update(value);return value;}
    if(route.includes('/reviews?'))return [{...review,user:{...review.user,login:reviewer}}];
    if(route.endsWith('/permission'))return {permission};
    if(route==='/graphql')return {data:{repository:{pullRequest:{reviewThreads:{nodes:[],pageInfo:{hasNextPage:false}}}}}};
    if(route.includes('/actions/runs?'))return {total_count:2,workflow_runs:[['CI','ci.yml'],['URAI Production Verify','urai-production-verify.yml']].map(([name,file],id)=>({id,name,path:'.github/workflows/'+file,head_sha:sha,status:'completed',conclusion:'success'}))};
    throw Error('Unexpected scoped request '+route);
  };
}
const options=()=>({sha,ref:`refs/heads/${controller.branch}`,profileName:'working-pr84',runId:'123',provider:'sendgrid',policy,api:fixture()});

test('current canonical main and retained admitted component84 are distinct governed source profiles',async()=>{
  assert.equal(sourceProfile('working-pr84').sha,'274f53573f4d3bf843047e285f080083a55fe1ab');
  for(const profileName of ['canonical-main','working-pr84']){
    const binding=await verifyStagingVerificationBinding({...options(),profileName});
    assert.equal(binding.communications.sha,sourceProfile(profileName).sha);
    assert.equal(binding.canonicalConsumerAdopted,false);
    assert.equal(binding.approval.prNumber,109);
    assert.equal(binding.approval.sha,sha);
    assert.equal(binding.approval.reviewer,'LimberNutz0');
    assert.equal(checkRetainedBinding(binding,{stagingSha:sha,communicationsSha:binding.communications.sha,runId:'123',provider:'sendgrid'}).stagingReviewPr,109);
  }
});
test('predecessor canonical main and working84 sources cannot authorize current verification or retained proof',async()=>{
  for(const [profileName,predecessor] of [
    ['canonical-main','89e37603ef28a1309e2311ed7cf36bd64592b8c8'],
    ['working-pr84','911ba3d2739ad64100148cfc827c55ad8915ff7a']
  ]){
    await assert.rejects(verifyStagingVerificationBinding({...options(),profileName,expectedCommunicationsSha:predecessor,
      api:()=>{throw Error('API SHOULD NOT RUN');}}),/outside selected/);
    const binding=structuredClone(await verifyStagingVerificationBinding({...options(),profileName}));
    binding.communications.sha=predecessor;
    assert.throws(()=>checkRetainedBinding(binding,{stagingSha:sha,communicationsSha:predecessor,runId:'123',provider:'sendgrid'}),/governed profile/);
  }
});
test('arbitrary profile, producer SHA or controller branch fails before any approval request',async()=>{
  for(const bad of [{profileName:'attacker'},{expectedCommunicationsSha:'b'.repeat(40)},{ref:'refs/heads/main'},{ref:'refs/heads/arbitrary'}]){
    await assert.rejects(verifyStagingVerificationBinding({...options(),...bad,api:()=>{throw Error('API SHOULD NOT RUN');}}),/Unknown governed|outside selected|Only the owned/);
  }
});
test('controller109 exact head, lineage and nondraft identity are enforced',async()=>{
  for(const update of [value=>{value.head.sha='b'.repeat(40);},value=>{value.head.ref='other';},value=>{value.base.ref='historical-base';},value=>{value.draft=true;},value=>{value.state='closed';}]){
    await assert.rejects(verifyStagingVerificationBinding({...options(),api:fixture({update})}));
  }
});
test('scoped source never substitutes arbitrary reviewer or unknown native permission',async()=>{
  for(const bad of [{reviewer:'OtherReviewer'},{permission:'read'},{permission:null}])await assert.rejects(verifyStagingVerificationBinding({...options(),api:fixture(bad)}),/APPROVED|permission/);
});
test('correct current canonical Twilio consumer ID and provider boundaries remain required',()=>{
  assert.equal(verifyCanonicalPolicy(policy,'twilio').id,'urai-communications-main-twilio-trial-e2e');
  assert.equal(verifyCanonicalPolicy(policy,'sendgrid').id,'urai-communications-main-sendgrid-signed-staging-e2e');
  for(const mutate of [p=>{p.productionAllowed=true;},p=>{p.consumers[0].twilioTrialModeOnly=false;},p=>{p.consumers[0].trialSenderMode='provider-assigned';},p=>{p.consumers[0].exactSha='b'.repeat(40);},p=>{p.consumers[0].initialFunctionDeploymentAllowlist.push('other');}]){
    const value=structuredClone(policy);mutate(value);assert.throws(()=>verifyCanonicalPolicy(value,'twilio'));
  }
});
test('retained proof rejects stale controller/run, wrong provider/reviewer/PR and altered working source',async()=>{
  const original=await verifyStagingVerificationBinding(options());
  for(const mutate of [b=>{b.stagingControllerSha='b'.repeat(40);},b=>{b.workflowRunId='122';},b=>{b.provider='twilio';},
    b=>{b.approval.sha='b'.repeat(40);},b=>{b.approval.prNumber=106;},b=>{b.approval.reviewer='OtherReviewer';},
    b=>{b.approval.reviewerPermission=null;},b=>{b.communications.sha='b'.repeat(40);},b=>{b.communications.repository='Other/repo';},
    b=>{b.canonicalConsumerAdopted=true;}]){
    const value=structuredClone(original);mutate(value);
    assert.throws(()=>checkRetainedBinding(value,{stagingSha:sha,communicationsSha:original.communications.sha,runId:'123',provider:'sendgrid'}));
  }
});



