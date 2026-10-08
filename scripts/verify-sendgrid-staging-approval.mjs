import { pathToFileURL } from 'node:url';

const repository = 'LifeLoggerAI/urai-staging';
const reviewer = 'LimberNutz0';
const requiredWorkflows = [
  ['CI', '.github/workflows/ci.yml'],
  ['URAI Production Verify', '.github/workflows/urai-production-verify.yml']
];
function requireTrue(value, message) { if (!value) throw new Error(message); }
export async function verifyStagingApproval({ sha, prNumber, api }) {
  requireTrue(/^[a-f0-9]{40}$/.test(sha || ''), 'Invalid exact staging SHA');
  requireTrue(Number.isSafeInteger(prNumber) && prNumber > 0, 'Invalid staging review PR');
  const prPath = `/repos/${repository}/pulls/${prNumber}`;
  const first = await api(prPath);
  const checkPR = pr => {
    requireTrue(pr.state === 'open' && pr.draft === false, 'Review target must be open and non-draft');
    requireTrue(pr.head?.sha === sha && pr.head?.repo?.full_name === repository, 'Staging review target does not match executing source');
    requireTrue(pr.user?.login && pr.user.login !== reviewer, 'Reviewer must be independent of PR author');
  };
  checkPR(first);
  const reviews = [];
  for (let page = 1; ; page++) {
    const values = await api(`${prPath}/reviews?per_page=100&page=${page}`);
    requireTrue(Array.isArray(values), 'Invalid review API response');
    reviews.push(...values);
    if (values.length < 100) break;
  }
  const decisions = reviews.filter(r => r.user?.login === reviewer && ['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(r.state))
    .sort((a,b) => Number(b.id) - Number(a.id));
  const decision = decisions[0];
  requireTrue(decision?.state === 'APPROVED' && decision.commit_id === sha, 'Missing current native exact-head LimberNutz0 APPROVED decision');
  requireTrue(decision.user?.type === 'User', 'Reviewer must be a human GitHub account');
  const eligibility = await api(`/repos/${repository}/collaborators/${reviewer}/permission`);
  requireTrue(['admin','maintain','write'].includes(eligibility.permission), 'Reviewer permission is insufficient or unknown for governed native approval');
  // A native review does not prove independence of prior implementation.
  // Human review disclosure remains required; no bot/self decision is accepted.
  let cursor = null;
  do {
    const result = await api('/graphql', {
      query: `query($number:Int!,$cursor:String){repository(owner:"LifeLoggerAI",name:"urai-staging"){pullRequest(number:$number){reviewThreads(first:100,after:$cursor){nodes{isResolved}pageInfo{hasNextPage endCursor}}}}}`,
      variables: { number: prNumber, cursor }
    });
    requireTrue(!result.errors, 'Cannot verify review threads');
    const threads = result.data?.repository?.pullRequest?.reviewThreads;
    requireTrue(Array.isArray(threads?.nodes), 'Missing review-thread evidence');
    requireTrue(threads.nodes.every(t => t.isResolved === true), 'Unresolved review thread blocks staging execution');
    requireTrue(threads.pageInfo && typeof threads.pageInfo.hasNextPage === 'boolean', 'Missing thread pagination evidence');
    if (!threads.pageInfo.hasNextPage) break;
    requireTrue(threads.pageInfo.endCursor && threads.pageInfo.endCursor !== cursor, 'Invalid thread pagination cursor');
    cursor = threads.pageInfo.endCursor;
  } while (true);
  const runs = [];
  let expected;
  for (let page = 1; ; page++) {
    const data = await api(`/repos/${repository}/actions/runs?head_sha=${sha}&per_page=100&page=${page}`);
    requireTrue(Array.isArray(data.workflow_runs) && Number.isSafeInteger(data.total_count), 'Missing exact-head workflow evidence');
    expected ??= data.total_count;
    requireTrue(expected === data.total_count, 'Workflow matrix changed during pagination; rerun preflight');
    runs.push(...data.workflow_runs);
    if (data.workflow_runs.length < 100) break;
  }
  requireTrue(runs.length === expected, 'Incomplete workflow pagination');
  for (const [name,path] of requiredWorkflows) {
    const matching = runs.filter(r => r.head_sha === sha && r.name === name && r.path === path)
      .sort((a,b) => Number(b.id) - Number(a.id));
    const latest = matching[0];
    requireTrue(latest?.status === 'completed' && latest.conclusion === 'success', `Latest exact-head ${name} is not SUCCESS`);
  }
  const last = await api(prPath);
  checkPR(last);
  requireTrue(last.updated_at === first.updated_at, 'Review target changed during preflight; rerun');
  return { repository, prNumber, sha, reviewer, reviewId: decision.id,
    reviewerAccountType:decision.user.type, reviewerPermission:eligibility.permission,
    requiredWorkflows: requiredWorkflows.map(x => x[0]) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.GITHUB_TOKEN;
  requireTrue(token, 'Missing read-only GitHub metadata token');
  const api = async (path, body) => {
    const response = await fetch('https://api.github.com' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json' },
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    requireTrue(response.ok, `Read-only approval API unavailable: ${response.status}`);
    return response.json();
  };
  const receipt = await verifyStagingApproval({ sha: process.env.GITHUB_SHA, prNumber:Number(process.env.STAGING_REVIEW_PR_NUMBER), api });
  console.log(JSON.stringify({ ...receipt, providerMutationAuthorizedByThisReceipt:false }));
}
