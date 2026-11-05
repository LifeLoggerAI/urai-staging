import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { privacyJobsStagingAdmissionProblems } from './validate-privacy-jobs-staging-admission.mjs';

// This is independent source approval, not permission to deploy or claim live revocation.
// Never accept caller-authored approval JSON; query GitHub on the protected runner.
export const SOURCE_GATES = Object.freeze([
  { repo: 'LifeLoggerAI/urai-privacy', workflows: ['URAI Privacy Release Verification', 'Release Verification'] },
  { repo: 'LifeLoggerAI/urai-jobs', workflows: ['CI', 'URAI Jobs Final CI'] },
]);

function requireFact(ok, description) {
  if (!ok) throw Error(description);
}

export async function verifyProtectedSourceApprovals(authority, githubGet) {
  const structure = privacyJobsStagingAdmissionProblems(authority);
  requireFact(structure.length === 0, `Source scope remains unapproved: ${structure.join('; ')}`);
  const accepted = [];
  for (const { repo, workflows } of SOURCE_GATES) {
    const consumer = authority.consumers.find(c => c.repository === repo);
    requireFact(consumer?.state === 'active', `${repo}: active reviewed consumer missing`);
    requireFact(Number.isSafeInteger(consumer.pullRequest) && consumer.pullRequest > 0, `${repo}: exact source PR is required`);
    const branch = consumer.sourceRef.slice('refs/heads/'.length);
    requireFact(consumer.sourceRef.startsWith('refs/heads/') && branch.length > 0, `${repo}: protected branch ref required`);
    const [owner, name] = repo.split('/');
    requireFact(owner === 'LifeLoggerAI' && !!name, 'Unexpected repository ownership');
    const base = `/repos/${owner}/${name}`;
    const first = await githubGet(`${base}/pulls/${consumer.pullRequest}`);
    requireFact(first?.state === 'open' && first.draft === false && !first.merged_at, `${repo}: PR is not open and approved for review`);
    requireFact(first.head?.sha === consumer.exactSha && first.head?.ref === branch,
      `${repo}: PR head does not match reviewed consumer SHA and branch`);
    requireFact(first.head?.repo?.full_name === repo && first.base?.repo?.full_name === repo,
      `${repo}: untrusted PR source/base repository`);
    requireFact(first.user?.login && first.user?.type === 'User', `${repo}: missing human PR author`);

    const ref = await githubGet(`${base}/git/ref/heads/${branch}`);
    requireFact(ref?.object?.sha === consumer.exactSha, `${repo}: live GitHub ref does not match reviewed SHA`);

    const reviews = await githubGet(`${base}/pulls/${consumer.pullRequest}/reviews?per_page=100`);
    requireFact(Array.isArray(reviews), `${repo}: GitHub reviews unavailable`);
    // Ignore stale approval when the same reviewer later requested changes/dismissed.
    const latest = new Map();
    for (const review of reviews) {
      const login = review?.user?.login;
      if (login && review.submitted_at) {
        const timestamp = Date.parse(review.submitted_at);
        if (Number.isFinite(timestamp) && (!latest.has(login) || latest.get(login).timestamp <= timestamp)) {
          latest.set(login, { ...review, timestamp });
        }
      }
    }
    let eligibleApproval = null;
    for (const review of latest.values()) {
      if (review.state !== 'APPROVED' || review.commit_id !== consumer.exactSha ||
          review.user?.type !== 'User' || review.user.login === first.user.login) continue;
      const permission = await githubGet(`${base}/collaborators/${encodeURIComponent(review.user.login)}/permission`);
      if (['write','maintain','admin'].includes(permission?.permission)) {
        eligibleApproval = { reviewer: review.user.login, reviewId: review.id };
        break;
      }
    }
    requireFact(eligibleApproval?.reviewId > 0, `${repo}: no eligible current-head independent APPROVED review`);

    const response = await githubGet(`${base}/actions/runs?head_sha=${consumer.exactSha}&event=pull_request&per_page=100`);
    requireFact(Array.isArray(response?.workflow_runs), `${repo}: protected workflow evidence unavailable`);
    for (const workflow of workflows) {
      requireFact(response.workflow_runs.some(run => run.name === workflow && run.head_sha === consumer.exactSha &&
          run.head_branch === branch && run.event === 'pull_request' && run.status === 'completed' &&
          run.conclusion === 'success' && Number(run.run_attempt) >= 1),
      `${repo}: protected workflow ${workflow} has no completed successful exact-head run`);
    }
    const last = await githubGet(`${base}/pulls/${consumer.pullRequest}`);
    requireFact(last.head?.sha === first.head.sha && last.head?.ref === first.head.ref &&
      last.updated_at === first.updated_at && last.state === 'open' && last.draft === false,
      `${repo}: source head or review metadata moved during verification`);
    accepted.push({ repository: repo, exactSha: consumer.exactSha, reviewId: eligibleApproval.reviewId,
      reviewer: eligibleApproval.reviewer, requiredWorkflows: workflows });
  }
  return { schemaVersion: 'urai-privacy-jobs-protected-source-approval-v1',
    state: 'source-only-approved', productionAuthorized: false, runtimeCertified: false,
    providerDeletionAcknowledged: false, accepted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const token = process.env.URAI_CROSS_REPO_READ_TOKEN || process.env.GITHUB_TOKEN;
    requireFact(!!token, 'Protected GitHub read-only token is required; no source approval attested');
    requireFact(process.env.GITHUB_ACTIONS === 'true', 'Protected GitHub Actions execution required');
    const authority = JSON.parse(fs.readFileSync(new URL('../config/staging-consumers.json', import.meta.url), 'utf8'));
    const githubGet = async route => {
      const res = await fetch('https://api.github.com' + route, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(15000)
      });
      requireFact(res.ok, `Protected GitHub source metadata not available (${res.status})`);
      return res.json();
    };
    const verdict = await verifyProtectedSourceApprovals(authority, githubGet);
    console.log(JSON.stringify(verdict));
    console.log('Protected SOURCE verification only. No staging runtime/deletion/prod release authorization.');
  } catch (error) {
    console.error('[GENESIS STAGING] HOLD: ' + error.message);
    process.exitCode = 1;
  }
}
