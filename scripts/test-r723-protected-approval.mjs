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
  else if(route.endsWith('/branches/main')) value={name:'main',protected:true,commit:{sha:'d'.repeat(40)},protection:{enabled:true,required_status_checks:{enforcement_level:'everyone',
    contexts:SOURCE_GATES.find(x=>x.repo===repo).requiredChecks,
    checks:SOURCE_GATES.find(x=>x.repo===repo).requiredChecks.map(context=>({context,app_id:15368}))}}};
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
    if(route.endsWith('/branches/main')){v.protection.required_status_checks.contexts=[];v.protection.required_status_checks.checks=[];}
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


test('R729 later changes-requested review beyond page 1 supersedes old approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/reviews?'))return;
    if(route.endsWith('page=1'))v.push(...Array.from({length:99},(_,i)=>({...v[0],id:300+i})));
    if(route.endsWith('page=2')){v[0].id=800;v[0].state='CHANGES_REQUESTED';v[0].submitted_at='2026-11-05T12:00:00Z';}
  }),/unresolved changes-requested reviewer/);
});
test('R729 later independent approval can supersede earlier changes request',async()=>{
  const verdict=await probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/reviews?'))return;
    if(route.endsWith('page=1')){v[0].state='CHANGES_REQUESTED';v.push(...Array.from({length:99},(_,i)=>({...v[0],id:400+i})));}
    if(route.endsWith('page=2')){v[0].id=801;v[0].state='APPROVED';v[0].submitted_at='2026-11-05T12:00:00Z';}
  });
  assert.equal(verdict.accepted.length,2);assert.equal(verdict.productionAuthorized,false);
});
test('R729 review-history fetch interruption rejects',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/reviews?'))return;
    if(route.endsWith('page=1'))v.push(...Array.from({length:99},(_,i)=>({...v[0],id:500+i})));
    if(route.endsWith('page=2'))throw Error('GitHub review page fetch denied');
  }),/review page fetch denied/);
});
test('R729 overlong GitHub review history fails closed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/reviews?'))
      v.push(...Array.from({length:99},(_,i)=>({...v[0],id:600+i})));
  }),/review history exceeds 10 pages/);
});
test('R730 outstanding second reviewer change request blocks approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/reviews?') && route.endsWith('page=1'))
      v.push({...v[0],id:402,user:{login:'OtherReviewer',type:'User'},state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'});
  }),/unresolved changes-requested reviewer/);
});
test('R730 a later COMMENTED review cannot clear outstanding change request',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/reviews?') && route.endsWith('page=1')){
      v.push({...v[0],id:403,user:{login:'OtherReviewer',type:'User'},state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'});
      v.push({...v[0],id:404,user:{login:'OtherReviewer',type:'User'},state:'COMMENTED',submitted_at:'2026-11-05T13:00:00Z'});
    }
  }),/unresolved changes-requested reviewer/);
});
test('R730 legitimate later approval clears earlier request without production GO',async()=>{
  const x=await probe((route,v)=>{
    if(route.includes('/reviews?') && route.endsWith('page=1')){
      v.push({...v[0],id:405,user:{login:'OtherReviewer',type:'User'},state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'});
      v.push({...v[0],id:406,user:{login:'OtherReviewer',type:'User'},state:'APPROVED',submitted_at:'2026-11-05T13:00:00Z'});
    }
  });
  assert.equal(x.accepted.length,2);assert.equal(x.productionAuthorized,false);
});
test('R730 malformed submitted change request fails closed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/reviews?') && route.endsWith('page=1'))
      v.push({...v[0],id:407,user:{login:'OtherReviewer',type:'User'},state:'CHANGES_REQUESTED',submitted_at:'invalid'});
  }),/malformed submitted review history/);
});
test('R730 ambiguous same-second changes request outranks approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/reviews?') && route.endsWith('page=1')){
      v.push({...v[0],id:408,user:{login:'OtherReviewer',type:'User'},state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'});
      v.push({...v[0],id:409,user:{login:'OtherReviewer',type:'User'},state:'APPROVED',submitted_at:'2026-11-05T12:00:00Z'});
    }
  }),/unresolved changes-requested reviewer/);
});


test('R735 unrelated required checks cannot certify source workflows',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main')){
      v.protection.required_status_checks.contexts=['UNRELATED_OPTIONAL_CHECK'];
      v.protection.required_status_checks.checks=[{context:'UNRELATED_OPTIONAL_CHECK',app_id:15368}];
    }
  }),/required source workflow job checks not pinned/);
});
test('R735 correct check names from unbound app cannot certify',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks.forEach(c=>{c.app_id=-1;});
  }),/required source workflow job checks not pinned/);
});
test('R735 one missing release-critical required job blocks source approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks.pop();
  }),/required source workflow job checks not pinned/);
});
test('R735 contexts alone without source app binding do not prove protection',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks=[];
  }),/required source workflow job checks not pinned/);
});
test('R735 status-check capitalization drift fails closed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks[0].context += '-shadow';
  }),/required source workflow job checks not pinned/);
});


test('R736 later failed exact-head workflow defeats stale green',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,status:'completed',conclusion:'failure'});
  }),/latest exact-head run not successful/);
});
test('R736 newer in-progress run defeats stale successful run',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,status:'in_progress',conclusion:'neutral'});
  }),/latest exact-head run not successful/);
});
test('R736 later failed attempt of same workflow run rejects',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],run_attempt:2,conclusion:'failure'});
  }),/latest exact-head run not successful/);
});
test('R736 later success legitimately supersedes an earlier failed run',async()=>{
  const r=await probe((route,v)=>{
    if(route.includes('/actions/runs?')){
      v.workflow_runs[0].status='completed';v.workflow_runs[0].conclusion='failure';
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,conclusion:'success'});
    }
  });
  assert.equal(r.accepted.length,2);assert.equal(r.productionAuthorized,false);
});
test('R736 malformed exact-head run identity denies approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))v.workflow_runs[0].id='not-a-run-id';
  }),/history missing or malformed/);
});
test('R736 same run attempt with contradictory outcomes fails closed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],conclusion:'failure'});
  }),/conflicting protected workflow run records/);
});
test('R736 unrelated failed workflow does not override required success',async()=>{
  const r=await probe((route,v)=>{
    if(route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,name:'Unrelated check',conclusion:'failure'});
  });
  assert.equal(r.accepted.length,2);assert.equal(r.productionAuthorized,false);
});
