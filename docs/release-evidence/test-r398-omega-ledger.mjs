import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sourceUrl = new URL('./r398-omega-release-ledger.json', import.meta.url);
const source = () => JSON.parse(readFileSync(sourceUrl, 'utf8'));
const SHA = /^[a-f0-9]{40}$/;
const REPOS = [
  'UrAi','urai-marketing','UrAi-Dev','UrAiProd','urai-analytics','urai-labs-llc',
  'urai-investors','urai-privacy','urai-admin','asset-factory','urai-content',
  'urai-foundation','urai-studio','urai-staging','urai-jobs','urai-spatial',
  'urai-communications','B2Bportal','urai-storytime',
];
const CANDIDATES = new Map([
  ['urai-spatial',1959],['urai-privacy',184],['urai-jobs',235],
  ['urai-studio',178],['urai-staging',118],['urai-content',112],['urai-marketing',59],
]);
const GATES = Array.from({length:12},(_,i)=>'G'+(i+1)+'_'+[
  'SOURCE','BUILD','INTEGRATION','PRIVACY','SECURITY','VISUAL','ACCESSIBILITY',
  'PERFORMANCE','PROVIDERS','INFRASTRUCTURE','GOVERNANCE','DISTRIBUTION',
][i]);
const denial = (message) => { throw new Error('R398_LEDGER_UNVERIFIED:'+message); };
export function verifyLedger(d) {
  if(d.schemaVersion!=='urai.genesis.omega.source-gated-release-ledger.v1'||
    d.wave!=='R398'||d.observationDateUtc!=='2026-11-03'||
    d.authoritativeTracker!=='LifeLoggerAI/urai-staging#116'||
    !d.classification.includes('NOT A FROZEN')||d.releaseVerdict!=='NO-GO')denial('classification');
  if(!Array.isArray(d.repositories)||d.repositories.length!==19)denial('repo_count');
  const seen = new Map();
  for(const row of d.repositories){
    if(!Array.isArray(row)||row.length!==2||!REPOS.includes(row[0])||
       !SHA.test(row[1])||seen.has(row[0]))denial('repo_ref');
    seen.set(row[0],row[1]);
  }
  if(!REPOS.every(name=>seen.has(name)))denial('repo_missing');
  if(!Array.isArray(d.draftCandidates)||d.draftCandidates.length!==7)denial('candidate_count');
  const selected=new Set();
  for(const c of d.draftCandidates){
    if(CANDIDATES.get(c.repository)!==c.pr||selected.has(c.repository)||
       !SHA.test(c.sha)||c.sha===seen.get(c.repository)||
       c.draft!==true||c.merged!==false||c.releaseAccepted!==false||c.reviews!==0||
       !Number.isSafeInteger(c.sampleRun)||c.sampleRun<1||c.sampleJobSteps!==0)denial('candidate');
    selected.add(c.repository);
    const runs=c.workflowResults;
    if(!runs||!['success','failure','skipped','startupFailure'].every(k=>Number.isSafeInteger(runs[k])&&runs[k]>=0)||
       runs.success!==0||runs.failure+runs.skipped+runs.startupFailure<1)denial('workflow_results');
  }
  if(![...CANDIDATES.keys()].every(name=>selected.has(name)))denial('missing_candidate');
  const provider=d.providers;
  if(provider.githubActions.state!=='BLOCKED'||provider.githubActions.supportCase!=='4889576'||
     provider.vercelContent.state!=='ERROR'||provider.vercelContent.releaseSourceProved!==false||
     !provider.vercelContent.observedError.includes('/vercel/path0/vercel/path0/')||
     provider.vercelApp.state!=='READY_STALE_SOURCE'||provider.vercelApp.releaseSourceProved!==false||
     provider.vercelApp.deployedSha===seen.get('UrAi')||
     provider.trustedLifeMovieConsentIssuer.state!=='NOT ACCEPTED'||
     provider.trustedLifeMovieConsentIssuer.lifeMovieRenderAuthorityEnabled!==false||
     provider.crossServiceAuthenticatedE2E.state!=='NOT VERIFIED')denial('provider');
  if(!Array.isArray(d.mandatoryReleaseGates)||d.mandatoryReleaseGates.length!==12)denial('gate_count');
  const gateIds=new Set();
  for(const gate of d.mandatoryReleaseGates){
    if(!Array.isArray(gate)||gate.length!==2||!GATES.includes(gate[0])||
      gate[1]!=='HOLD'||gateIds.has(gate[0]))denial('gate');
    gateIds.add(gate[0]);
  }
  if(gateIds.size!==12)denial('missing_gate');
  const e=d.evidenceScope;
  if(e.mainReferencesObserved!==19||e.activeDraftCandidatesObserved!==7||
     e.protectedExactShaCiPassed!==false||e.authenticatedDeletionAndConsentE2EPassed!==false||
     e.independentNonAuthorApprovalVerified!==false||e.protectedPreviewAndRollbackVerified!==false||
     e.productionPromotionAuthorized!==false)denial('acceptance');
  return true;
}
const rejects=(mutator)=>{const d=source();mutator(d);assert.throws(()=>verifyLedger(d),/R398_LEDGER_UNVERIFIED/);};

test('baseline read-only historical snapshot is complete but globally NO-GO',()=>assert.equal(verifyLedger(source()),true));
test('rejects forged global GO',()=>rejects(d=>{d.releaseVerdict='GO';}));
test('rejects release gate laundering',()=>rejects(d=>{d.mandatoryReleaseGates[0][1]='PASS';}));
test('rejects missing repository',()=>rejects(d=>{d.repositories.pop();}));
test('rejects duplicate repository hidden in list',()=>rejects(d=>{d.repositories[1][0]='UrAi';}));
test('rejects malformed or moving main ref',()=>rejects(d=>{d.repositories[1][1]='main';}));
test('rejects missing candidate',()=>rejects(d=>{d.draftCandidates.pop();}));
test('rejects fabricated accepted or merged candidate',()=>rejects(d=>{d.draftCandidates[1].releaseAccepted=true;d.draftCandidates[1].merged=true;}));
test('rejects passing hosted CI with no execution proof',()=>rejects(d=>{d.draftCandidates[2].workflowResults.success=1;}));
test('rejects invented independent review',()=>rejects(d=>{d.draftCandidates[0].reviews=1;}));
test('rejects false recorded test steps',()=>rejects(d=>{d.draftCandidates[1].sampleJobSteps=4;}));
test('rejects Content ERROR misreported as READY',()=>rejects(d=>{d.providers.vercelContent.state='READY';}));
test('rejects stale Vercel app promoted as source proof',()=>rejects(d=>{d.providers.vercelApp.releaseSourceProved=true;}));
test('rejects consent render gate activation',()=>rejects(d=>{d.providers.trustedLifeMovieConsentIssuer.lifeMovieRenderAuthorityEnabled=true;}));
test('rejects invented authenticated E2E',()=>rejects(d=>{d.evidenceScope.authenticatedDeletionAndConsentE2EPassed=true;}));
test('rejects invented founder production promotion approval',()=>rejects(d=>{d.evidenceScope.productionPromotionAuthorized=true;}));
