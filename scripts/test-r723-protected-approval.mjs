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
  else if(route.endsWith('/branches/main')) {const requiredChecks=SOURCE_GATES.find(x=>x.repo===repo).requiredChecks; value={name:'main',protected:true,commit:{sha:'d'.repeat(40)},protection:{enabled:true,required_status_checks:{enforcement_level:'everyone',contexts:requiredChecks,checks:requiredChecks.map(context=>({context,app_id:15368}))}}};}
  else if(route.includes('/git/ref/')) value={object:{sha}};
  else if(route.includes('/reviews?'))value=[{id:200,state:'APPROVED',commit_id:sha,submitted_at:'2026-11-05T11:00:00Z',user:{login:'IndependentReviewer',type:'User'}}];
  else if(route.includes('/permission'))value={permission:'write'};
  else if(route.includes('/actions/runs?'))value={workflow_runs:SOURCE_GATES.find(x=>x.repo===repo).workflows.map((name,id)=>({name,
    workflow_id:SOURCE_GATES.find(x=>x.repo===repo).workflowIdentities[name].id,
    path:SOURCE_GATES.find(x=>x.repo===repo).workflowIdentities[name].path,
    head_sha:sha,head_branch:'reviewed',event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,id:id+10,check_suite_id:id+100}))};
  else if(route.includes('/check-runs?')){const names=SOURCE_GATES.find(x=>x.repo===repo).requiredChecks;value={total_count:names.length,check_runs:names.map((name,id)=>({id:1000+id,name,check_suite:{id:(jobs&&id>0?101:100+id)},head_sha:sha,status:'completed',conclusion:'success',app:{slug:'github-actions',id:15368}}))};}
  else throw Error('Unexpected GitHub request: '+route);
  const copy=structuredClone(value);mutate(route,copy);
  if(route.includes('/actions/runs?') && copy.total_count === undefined &&
      Array.isArray(copy.workflow_runs)) copy.total_count=copy.workflow_runs.length;
  return copy;
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
  await assert.rejects(probe((route,v)=>{if(route.includes('/reviews?'))v.push({...v[0],id:201,state:'CHANGES_REQUESTED',submitted_at:'2026-11-05T12:00:00Z'})}),/unresolved changes-requested reviewer/);
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

test('R729 fake external app check cannot satisfy required CI',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/check-runs?'))v.check_runs[0].app.slug='fake-ci';
  }),/latest required source check not green|required source workflow job checks not green|did not satisfy an enforced GitHub Actions check/);
});
test('R729 unrelated successful suite cannot be substituted',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/check-runs?'))v.check_runs[0].check_suite.id=999999;
  }),/latest required source check not green|did not satisfy an enforced GitHub Actions check/);
});
test('R729 failed required check rejects even when workflow claims success',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/check-runs?'))v.check_runs[0].conclusion='failure';
  }),/latest required source check not green|required source workflow job checks not green|did not satisfy an enforced GitHub Actions check/);
});
test('R729 wrong commit check cannot authorize source',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/check-runs?'))v.check_runs[0].head_sha='c'.repeat(40);
  }),/latest required source check not green|required source workflow job checks not green|did not satisfy an enforced GitHub Actions check/);
});
test('R729 missing check suite ID denies claimed successful workflow',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/actions/runs?'))delete v.workflow_runs[0].check_suite_id;
  }),/no completed successful exact-head run/);
});
test('R729 truncated check-run pagination denies all approvals',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('/check-runs?'))v.total_count=101;
  }),/complete exact-head check-run evidence unavailable/);
});
test('R729 checks not configured as mandatory reject unprotected workflow',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main')){v.protection.required_status_checks.contexts=['different-required-check'];v.protection.required_status_checks.checks=[{context:'different-required-check',app_id:15368}];}
  }),/required source workflow job checks not pinned|did not satisfy an enforced GitHub Actions check/);
});
test('R729 app-specific required check must be from matching GitHub App ID',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks=[{context:SOURCE_GATES.find(x=>x.repo=== (route.includes('urai-jobs')?'LifeLoggerAI/urai-jobs':'LifeLoggerAI/urai-privacy')).requiredChecks[0],app_id:9999}];
  }),/required source workflow job checks not pinned|did not satisfy an enforced GitHub Actions check/);
});

test('R734 review submission after initial GitHub read invalidates the source verdict', async()=>{
  let reads=0;
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/reviews?') && ++reads===2){
      v.push({...v[0],id:991,user:{login:'SecondReviewer',type:'User'},state:'CHANGES_REQUESTED',
        submitted_at:'2026-11-05T17:00:00Z'});
    }
  }), /review history changed during verification/);
});

test('R734 approval dismissed after first review read cannot be used', async()=>{
  let reads=0;
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/reviews?') && ++reads===2){
      v[0].state='DISMISSED';
    }
  }), /review history changed during verification/);
});

test('R734 approval removed during workflow checks cannot be used', async()=>{
  let reads=0;
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/reviews?') && ++reads===2){
      v.splice(0,v.length);
    }
  }), /review history changed during verification/);
});

test('R734 unchanged review snapshot still passes source-only and never grants release', async()=>{
  const verdict=await probe(()=>{});
  assert.equal(verdict.accepted.length,2);
  assert.equal(verdict.productionAuthorized,false);
  assert.equal(verdict.runtimeCertified,false);
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
    if(route.endsWith('/branches/main'))v.protection.required_status_checks.checks[0].context+='-shadow';
  }),/required source workflow job checks not pinned/);
});

test('R736 a failed extra required Jobs job must block even with workflow-level green',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?'))v.check_runs[2].conclusion='failure';
  }),/latest required source check not green|required source workflow job checks not green/);
});
test('R736 one missing extra required Jobs job must block even with workflow-level green',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?')){v.check_runs.splice(2,1);v.total_count--;}
  }),/latest required source check not green|required source workflow job checks not green/);
});
test('R736 a forged extra required Jobs job app cannot be used',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?'))v.check_runs[2].app.id=9999;
  }),/latest required source check not green|required source workflow job checks not green/);
});


test('R737 newer failed workflow run defeats stale green run',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,conclusion:'failure'});
  }),/latest exact-head run not successful/);
});
test('R737 newer in-progress workflow defeats stale green run',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,status:'in_progress',conclusion:null});
  }),/latest exact-head run not successful/);
});
test('R737 newer failed attempt of same workflow run rejects',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],run_attempt:2,conclusion:'failure'});
  }),/latest exact-head run not successful/);
});
test('R737 newer successful workflow supersedes older failure without production GO',async()=>{
  const r=await probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?')){
      v.workflow_runs[0].conclusion='failure';
      v.workflow_runs.push({...v.workflow_runs[0],id:9001,conclusion:'success'});
    }
  });
  assert.equal(r.accepted.length,2);assert.equal(r.productionAuthorized,false);
});
test('R737 malformed workflow run id denies latest-run selection',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))v.workflow_runs[0].id='forged';
  }),/exact-head history missing or malformed/);
});
test('R737 contradictory results of same run attempt fail closed',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))
      v.workflow_runs.push({...v.workflow_runs[0],conclusion:'failure'});
  }),/conflicting protected workflow run records/);
});
test('R737 newer failed required check-run defeats older passing check-run',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?')){
      v.check_runs.push({...v.check_runs[2],id:9000,conclusion:'failure'});v.total_count++;
    }
  }),/latest required source check not green/);
});
test('R737 newer queued required check-run defeats older green check-run',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?')){
      v.check_runs.push({...v.check_runs[2],id:9000,status:'queued',conclusion:null});v.total_count++;
    }
  }),/latest required source check not green/);
});
test('R737 latest required check-run from unrelated suite cannot substitute old green',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?')){
      v.check_runs.push({...v.check_runs[2],id:9000,check_suite:{id:999}});v.total_count++;
    }
  }),/latest required source check not green/);
});
test('R737 passing check history changed during verification rejects stale snapshot',async()=>{
  let reads=0;
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/check-runs?')&&++reads===2){
      v.check_runs.push({...v.check_runs[0],id:9000,conclusion:'failure'});v.total_count++;
    }
  }),/Actions evidence changed during verification/);
});

test('R738 missing workflow total_count refuses source approval',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))v.total_count=null;
  }),/protected workflow history count invalid or changed/);
});
test('R738 inconsistent workflow total_count refuses truncated history',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/actions/runs?'))v.total_count=999;
  }),/protected workflow history count incomplete/);
});
test('R738 older green cannot hide newer failed second-page workflow',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/actions/runs?'))return;
    if(route.endsWith('page=1')){
      v.workflow_runs.push(...Array.from({length:98},(_,i)=>({...v.workflow_runs[0],name:'Unrelated',id:400+i})));
      v.total_count=101;
    }
    if(route.endsWith('page=2')){
      v.workflow_runs=[{...v.workflow_runs[0],id:9001,conclusion:'failure'}];
      v.total_count=101;
    }
  }),/latest exact-head run not successful/);
});
test('R738 second page unavailable must not certify partial workflow history',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/actions/runs?'))return;
    if(route.endsWith('page=1')){
      v.workflow_runs.push(...Array.from({length:98},(_,i)=>({...v.workflow_runs[0],name:'Unrelated',id:500+i})));
      v.total_count=101;
    }
    if(route.endsWith('page=2'))throw Error('GitHub workflow page 2 unavailable');
  }),/GitHub workflow page 2 unavailable/);
});
test('R738 newer successful second-page workflow supersedes failed older run without release GO',async()=>{
  const result=await probe((route,v)=>{
    if(!route.includes('urai-privacy')||!route.includes('/actions/runs?'))return;
    if(route.endsWith('page=1')){
      v.workflow_runs[0].conclusion='failure';
      v.workflow_runs.push(...Array.from({length:98},(_,i)=>({...v.workflow_runs[0],name:'Unrelated',id:600+i})));
      v.total_count=101;
    }
    if(route.endsWith('page=2')){
      v.workflow_runs=[{...v.workflow_runs[0],id:9001,conclusion:'success'}];
      v.total_count=101;
    }
  });
  assert.equal(result.accepted.length,2);
  assert.equal(result.productionAuthorized,false);
});
test('R738 missing latest required check id cannot authorize source',async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy')&&route.includes('/check-runs?'))delete v.check_runs[0].id;
  }),/latest required source check not green/);
});
test('R738 newer passing required check supersedes earlier failure without release GO',async()=>{
  const result=await probe((route,v)=>{
    if(route.includes('urai-jobs')&&route.includes('/check-runs?')){
      const old=v.check_runs.find(x=>x.name==='Firebase config smoke');
      old.conclusion='failure';
      v.check_runs.push({...old,id:9001,conclusion:'success'});v.total_count++;
    }
  });
  assert.equal(result.accepted.length,2);
  assert.equal(result.productionAuthorized,false);
});


test('R740 rejects workflow display-name impersonation from an unrelated workflow ID and file', async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/actions/runs?')) {
      v.workflow_runs[0].conclusion='failure';
      v.workflow_runs.push({...v.workflow_runs[0],id:9009,conclusion:'success',
        workflow_id:9999999,path:'.github/workflows/attacker-run.yml'});
      v.total_count=v.workflow_runs.length;
    }
  }),/trusted workflow identity/);
});

test('R740 refuses expected workflow when GitHub workflow ID is missing', async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/actions/runs?'))
      delete v.workflow_runs[0].workflow_id;
  }),/trusted workflow identity/);
});

test('R740 refuses expected workflow with correct name and wrong workflow ID', async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs') && route.includes('/actions/runs?'))
      v.workflow_runs[0].workflow_id=9999999;
  }),/trusted workflow identity/);
});

test('R740 refuses expected workflow with correct name and wrong workflow file path', async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-jobs') && route.includes('/actions/runs?'))
      v.workflow_runs[0].path='.github/workflows/fake-ci.yml';
  }),/trusted workflow identity/);
});

test('R740 rejects a missing workflow file path even if all job checks are green', async()=>{
  await assert.rejects(probe((route,v)=>{
    if(route.includes('urai-privacy') && route.includes('/actions/runs?'))
      delete v.workflow_runs[1].path;
  }),/trusted workflow identity/);
});

test('R740 verified workflow identities keep approval SOURCE ONLY', async()=>{
  const result=await probe(()=>{});
  assert.equal(result.accepted.length,2);
  assert.equal(result.productionAuthorized,false);
  assert.equal(result.runtimeCertified,false);
});
