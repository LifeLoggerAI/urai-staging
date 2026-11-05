import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyProtectedSourceApprovals, SOURCE_GATES } from './verify-privacy-jobs-protected-approval.mjs';

const a='a'.repeat(40), b='b'.repeat(40);
const makeAuthority=()=>({projectId:'urai-staging',environment:'staging',productionAllowed:false,
  consumers: SOURCE_GATES.map(({repo},i)=>({id:`synthetic-${i}`,repository:repo,state:'active',sourceRef:'refs/heads/reviewed',
    exactSha:i?b:a,pullRequest:i?272:221,providerProject:'urai-staging',allowedEnvironment:'staging',dataPolicy:'synthetic-only',
    productionDeploymentAuthorized:false,productionDataAuthorized:false,longLivedCredentialsAuthorized:false,
    projectWideRuleMutationAuthorized:false,hostingMutationAuthorized:false,allowedDeployScopes:['functions-explicit-only']}))});
const makeAPI=(mutate=()=>{})=>async route=>{
  const jobs=route.includes('urai-jobs');const repo=jobs?'LifeLoggerAI/urai-jobs':'LifeLoggerAI/urai-privacy';
  const sha=jobs?b:a;
  let value;
  if(/\/pulls\/\d+$/.test(route))value={state:'open',draft:false,merged_at:null,head:{sha,ref:'reviewed',repo:{full_name:repo}},base:{ref:'main',repo:{full_name:repo}},user:{login:'OriginalAuthor',type:'User'},updated_at:'2026-11-05T10:00:00Z'};
  else if(route.endsWith('/branches/main')) value={name:'main',protected:true,commit:{sha:'d'.repeat(40)},protection:{enabled:true,required_status_checks:{enforcement_level:'everyone',contexts:['CI','Release Verification'],checks:[]}}};
  else if(route.includes('/git/ref/')) value={object:{sha}};
  else if(route.includes('/reviews?'))value=[{id:200,state:'APPROVED',commit_id:sha,submitted_at:'2026-11-05T11:00:00Z',user:{login:'IndependentReviewer',type:'User'}}];
  else if(route.includes('/permission'))value={permission:'write'};
  else if(route.includes('/actions/runs?'))value={workflow_runs:SOURCE_GATES.find(x=>x.repo===repo).workflows.map((name,id)=>({name,head_sha:sha,head_branch:'reviewed',event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,id:id+10}))};
  else throw Error('Unexpected GitHub request: '+route);
  const copy=structuredClone(value);mutate(route,copy);return copy;
};
const probe=(fn,auth=makeAuthority())=>verifyProtectedSourceApprovals(auth,makeAPI(fn));

test('R723 mock approved exact-head source proves SOURCE only, never live runtime',async()=>{
  const verdict=await probe(()=>{});
  assert.equal(verdict.accepted.length,2);assert.equal(verdict.runtimeCertified,false);
  assert.equal(verdict.productionAuthorized,false);assert.equal(verdict.providerDeletionAcknowledged,false);
});
test('R723 fabricated active refs cannot pass GitHub branch verification',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.includes('/git/ref/'))v.object.sha='c'.repeat(40)}),/live GitHub ref/);
});
test('R723 missing issuer/receiver cannot pass',async()=>{
  await assert.rejects(verifyProtectedSourceApprovals({projectId:'urai-staging',environment:'staging',productionAllowed:false,consumers:[]},makeAPI()),/scope remains unapproved/);
});
test('R723 changed PR head or draft rejected',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.endsWith('/pulls/221'))v.head.sha='c'.repeat(40)}),/PR head/);
  await assert.rejects(probe((route,v)=>{if(route.endsWith('/pulls/221'))v.draft=true}),/not open and approved/);
});
test('R723 self approval and reader-only reviewer rejected',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.includes('/reviews?'))v[0].user.login='OriginalAuthor'}),/no eligible current-head/);
  await assert.rejects(probe((route,v)=>{if(route.includes('/permission'))v.permission='read'}),/no eligible current-head/);
});
test('R723 stale or superseded approval rejected',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.includes('/reviews?'))v[0].commit_id='c'.repeat(40)}),/no eligible current-head/);
  await assert.rejects(probe((route,v)=>{if(route.includes('/reviews?'))v.push({...v[0],id:201,state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'})}),/no eligible current-head/);
});
test('R723 failed or missing protected CI rejected',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.includes('/actions/runs?'))v.workflow_runs[0].conclusion='failure'}),/protected workflow/);
  await assert.rejects(probe((route,v)=>{if(route.includes('/actions/runs?'))v.workflow_runs=[]}),/protected workflow/);
});
test('R723 mutation after review rejected',async()=>{
  const seen={};await assert.rejects(probe((route,v)=>{if(route.endsWith('/pulls/221')){seen[route]=(seen[route]||0)+1;if(seen[route]===2)v.updated_at='2026-11-05T15:00:00Z';}}),/metadata moved/);
});
test('R723 branch mismatch rejected',async()=>{
  await assert.rejects(probe((route,v)=>{if(route.endsWith('/pulls/221'))v.head.ref='elsewhere'}),/PR head/);
});

test('R727 unprotected main branch rejected even if reviewer and CI passed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main')){v.protected=false;v.protection.enabled=false;}
  }),/main is not protected/);
});
test('R727 missing mandatory status checks rejected',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.contexts=[];
  }),/mandatory required status checks/);
});
test('R727 admin-bypassable policy rejected',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.enforcement_level='non_admins';
  }),/mandatory required status checks/);
});
test('R727 protected policy removed mid-verification rejected',async()=>{
  let seen=0;
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main') && ++seen===2)v.protected=false;
  }),/policy or source moved/);
});
test('R727 protected main commit changed during verification rejected',async()=>{
  let seen=0;
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main') && ++seen===2)v.commit.sha='e'.repeat(40);
  }),/policy or source moved/);
});
test('R727 PR targeting an unprotected side branch rejected',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/pulls/221'))v.base.ref='release-shadow';
  }),/target protected main/);
});
