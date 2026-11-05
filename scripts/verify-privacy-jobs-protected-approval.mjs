import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { privacyJobsStagingAdmissionProblems } from './validate-privacy-jobs-staging-admission.mjs';

// This is independent source approval, not permission to deploy or claim live revocation.
// Never accept caller-authored approval JSON; query GitHub on the protected runner.
export const SOURCE_GATES = Object.freeze([
  { repo: 'LifeLoggerAI/urai-privacy', workflows: ['URAI Privacy Release Verification', 'Release Verification'],
    requiredChecks: ['release-verification', 'verify-release'] },
  { repo: 'LifeLoggerAI/urai-jobs', workflows: ['CI', 'URAI Jobs Final CI'],
    requiredChecks: ['build', 'Verify workspace and launch lock', 'Web typecheck and build',
      'Functions build and tests', 'Firebase config smoke'] },
]);

function requireFact(ok, description) {
  if (!ok) throw Error(description);
}

export async function verifyProtectedSourceApprovals(authority, githubGet) {
  const structure = privacyJobsStagingAdmissionProblems(authority);
  requireFact(structure.length === 0, `Source scope remains unapproved: ${structure.join('; ')}`);
  const accepted = [];
  for (const { repo, workflows, requiredChecks } of SOURCE_GATES) {
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
    // Passing jobs alone does not make a branch protected. The final
    // independent-source approval must target main with an enforced required
    // status-check policy that applies to repository administrators, too.
    requireFact(first.base?.ref === 'main', `${repo}: review PR must target protected main`);
    const mainPolicy = await githubGet(`${base}/branches/main`);
    const requiredStatus = mainPolicy?.protection?.required_status_checks;
    const requiredContexts = [
      ...(Array.isArray(requiredStatus?.contexts) ? requiredStatus.contexts : []),
      ...(Array.isArray(requiredStatus?.checks)
        ? requiredStatus.checks.map(check => check?.context) : [])
    ].filter(context => typeof context === 'string' && context.trim().length > 0);
    requireFact(mainPolicy?.name === 'main' && mainPolicy?.protected === true &&
      mainPolicy?.protection?.enabled === true &&
      requiredStatus?.enforcement_level === 'everyone' &&
      requiredContexts.length > 0,
      `${repo}: main is not protected with mandatory required status checks for everyone`);
    // Named release-critical jobs must be required on main AND bound to
    // GitHub Actions app ID 15368. Context-only protection is insufficient.
    requireFact(Array.isArray(requiredStatus?.checks) &&
      requiredChecks.every(context => requiredStatus.checks.some(binding =>
        binding?.context === context && binding.app_id === 15368)),
      `${repo}: required source workflow job checks not pinned to GitHub Actions app`);
    requireFact(first.user?.login && first.user?.type === 'User', `${repo}: missing human PR author`);

    const ref = await githubGet(`${base}/git/ref/heads/${branch}`);
    requireFact(ref?.object?.sha === consumer.exactSha, `${repo}: live GitHub ref does not match reviewed SHA`);

    // Full review-history read: later changes requests on any page invalidate stale approvals.
    // Refuse malformed/unavailable pages and unsupported histories. Never use caller approval JSON.
    const reviewPageSize = 100;
    const maxReviewPages = 10;
    const readReviewHistory = async () => {
      const entries = [];
      let reviewHistoryComplete = false;
      for (let page = 1; page <= maxReviewPages; page++) {
        const reviewPage = await githubGet(
          `${base}/pulls/${consumer.pullRequest}/reviews?per_page=${reviewPageSize}&page=${page}`);
        requireFact(Array.isArray(reviewPage) && reviewPage.length <= reviewPageSize,
          `${repo}: GitHub review-history page ${page} unavailable or malformed`);
        entries.push(...reviewPage);
        if (reviewPage.length < reviewPageSize) {
          reviewHistoryComplete = true;
          break;
        }
      }
      requireFact(reviewHistoryComplete,
        `${repo}: GitHub review history exceeds ${maxReviewPages} pages; fail closed`);
      return entries;
    };
    const reviews = await readReviewHistory();
    const originalReviewSnapshot = JSON.stringify(reviews);
    // COMMENTED must not erase an outstanding CHANGES_REQUESTED review.
    const terminalStates = new Set(['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED', 'COMMENTED']);
    const latest = new Map();
    for (const review of reviews) {
      if (review?.state === 'PENDING') continue;
      const login = review?.user?.login;
      const timestamp = Date.parse(review?.submitted_at ?? '');
      requireFact(terminalStates.has(review?.state) && typeof login === 'string' &&
        login.trim().length > 0 && Number.isFinite(timestamp),
        `${repo}: malformed submitted review history`);
      if (review.state === 'COMMENTED') continue;
      const previous = latest.get(login);
      if (!previous || timestamp > previous.timestamp ||
          (timestamp === previous.timestamp && review.state === 'CHANGES_REQUESTED' &&
            previous.state !== 'CHANGES_REQUESTED')) {
        latest.set(login, { ...review, timestamp });
      }
    }
    // Even one eligible approval does not defeat another reviewer's
    // outstanding CHANGES_REQUESTED disposition.
    requireFact(![...latest.values()].some(review => review.state === 'CHANGES_REQUESTED'),
      `${repo}: unresolved changes-requested reviewer`);
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
    // A successful workflow that is NOT required by branch protection is not
    // protected CI evidence. Link each expected workflow's GitHub Actions
    // check suite to at least one *enforced* successful check on this SHA.
    const checksResponse = await githubGet(
      `${base}/commits/${consumer.exactSha}/check-runs?per_page=100&filter=all`);
    requireFact(Array.isArray(checksResponse?.check_runs) &&
      Number.isSafeInteger(checksResponse.total_count) &&
      checksResponse.total_count > 0 &&
      checksResponse.total_count === checksResponse.check_runs.length,
      `${repo}: complete exact-head check-run evidence unavailable`);
    const enforceRequiredCheckApp = check => {
      if (check?.app?.slug !== 'github-actions' || check.app.id !== 15368) return false;
      return requiredStatus.checks.some(binding =>
        binding?.context === check.name && binding.app_id === 15368);
    };
    // A green parent workflow does not prove every required job actually
    // ran and passed. Require all named branch-protected release jobs on the
    // exact candidate SHA, not only one check per parent workflow.
    const newestRequiredChecks = new Map();
    for (const context of requiredChecks) {
      const history = checksResponse.check_runs.filter(check =>
        check?.name === context && check.head_sha === consumer.exactSha &&
        enforceRequiredCheckApp(check));
      requireFact(history.length > 0 && history.every(check =>
        Number.isSafeInteger(check.id) && check.id > 0 &&
        Number.isSafeInteger(check.check_suite?.id) && check.check_suite.id > 0 &&
        typeof check.status === 'string' && typeof check.conclusion === 'string'),
        `${repo}: required source workflow job checks not green on exact reviewed SHA`);
      const byId = new Map();
      for (const check of history) {
        if (byId.has(check.id)) {
          const previous = byId.get(check.id);
          requireFact(previous.status === check.status && previous.conclusion === check.conclusion &&
            previous.check_suite?.id === check.check_suite.id,
            `${repo}: conflicting required source check records`);
        }
        byId.set(check.id, check);
      }
      const newest = history.reduce((winner, check) => check.id > winner.id ? check : winner);
      requireFact(newest.status === 'completed' && newest.conclusion === 'success',
        `${repo}: required source workflow job checks not green on exact reviewed SHA`);
      newestRequiredChecks.set(context, newest);
    }
    // Do not permit a stale successful workflow to mask a later failed run or
    // incomplete rerun on the very same exact reviewed commit. A full page is
    // not proof of complete history: require another page or HOLD. This gate
    // deliberately fails closed rather than treating unknown history as green.
    requireFact(response.workflow_runs.length < 100,
      `${repo}: protected workflow history page incomplete; fail closed`);
    for (const workflow of workflows) {
      const history = response.workflow_runs.filter(run =>
        run?.name === workflow && run.head_sha === consumer.exactSha &&
        run.head_branch === branch && run.event === 'pull_request');
      requireFact(history.length > 0 && history.every(run =>
        Number.isSafeInteger(run.id) && run.id > 0 &&
        Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0 &&
        typeof run.status === 'string' && typeof run.conclusion === 'string'),
        `${repo}: protected workflow ${workflow} exact-head history missing or malformed`);
      const identity = new Map();
      for (const run of history) {
        const key = `${run.id}/${run.run_attempt}`;
        if (identity.has(key)) {
          const previous = identity.get(key);
          requireFact(previous.status === run.status && previous.conclusion === run.conclusion &&
            previous.check_suite_id === run.check_suite_id,
            `${repo}: conflicting protected workflow run records`);
        }
        identity.set(key, run);
      }
      const newest = history.reduce((winner, run) =>
        run.id > winner.id || (run.id === winner.id && run.run_attempt > winner.run_attempt)
          ? run : winner);
      requireFact(newest.status === 'completed' && newest.conclusion === 'success',
        `${repo}: protected workflow ${workflow} latest exact-head run not successful`);
      requireFact(Number.isSafeInteger(newest.check_suite_id) && newest.check_suite_id > 0,
        `${repo}: protected workflow ${workflow} has no completed successful exact-head run`);
      requireFact([...newestRequiredChecks.values()].some(check =>
        requiredContexts.includes(check.name) &&
        check.check_suite?.id === newest.check_suite_id &&
        check.head_sha === consumer.exactSha &&
        check.status === 'completed' && check.conclusion === 'success' &&
        enforceRequiredCheckApp(check)),
        `${repo}: protected workflow ${workflow} did not satisfy an enforced GitHub Actions check`);
    }
    const last = await githubGet(`${base}/pulls/${consumer.pullRequest}`);
    requireFact(last.head?.sha === first.head.sha && last.head?.ref === first.head.ref &&
      last.base?.ref === 'main' && last.updated_at === first.updated_at &&
      last.state === 'open' && last.draft === false,
      `${repo}: source head or review metadata moved during verification`);
    // Check again after the required workflows: policy removal mid-check must
    // not turn an earlier protected read into a fresh release-ready claim.
    const currentPolicy = await githubGet(`${base}/branches/main`);
    requireFact(JSON.stringify(currentPolicy?.protection) === JSON.stringify(mainPolicy.protection) &&
      currentPolicy?.protected === true && currentPolicy?.commit?.sha === mainPolicy?.commit?.sha,
      `${repo}: protected main policy or source moved during verification`);
    // Do not attest from an approval snapshot that became stale while CI was
    // checked. New reviews, dismissed approvals and new change requests fail
    // closed even if GitHub did not update the parent PR timestamp.
    const currentReviews = await readReviewHistory();
    requireFact(JSON.stringify(currentReviews) === originalReviewSnapshot,
      `${repo}: review history changed during verification; retry required`);
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
