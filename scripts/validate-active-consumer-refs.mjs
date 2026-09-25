import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync(new URL('../config/staging-consumers.json', import.meta.url), 'utf8'));
const failures = [];
const results = [];
const protectedConsumers = [];

for (const c of doc.consumers || []) {
  if (c.state !== 'active') continue;
  const mode = c.refVerification?.mode;
  if (mode === 'protected-github-api') {
    protectedConsumers.push({
      id: c.id,
      repository: c.repository,
      pullRequest: c.pullRequest,
      expectedSha: c.exactSha,
      environment: c.refVerification.environment,
      requiredSecret: c.refVerification.requiredSecret,
    });
    continue;
  }
  if (mode !== 'public-git-ls-remote') {
    failures.push(`${c.id}: unsupported refVerification mode ${String(mode)}`);
    continue;
  }
  const remote = `https://github.com/${c.repository}.git`;
  let stdout = '';
  try {
    stdout = execFileSync('git', ['ls-remote', '--exit-code', remote, c.sourceRef], { encoding: 'utf8' }).trim();
  } catch {
    failures.push(`${c.id}: unable to resolve public ref ${c.repository} ${c.sourceRef}`);
    continue;
  }
  const liveSha = stdout.split(/\s+/)[0] || '';
  results.push({ id: c.id, expectedSha: c.exactSha, liveSha, sourceRef: c.sourceRef, verificationMode: mode });
  if (liveSha !== c.exactSha) failures.push(`${c.id}: stale expected=${c.exactSha} live=${liveSha}`);
}

console.log(JSON.stringify({
  schemaVersion: 'urai-staging-active-consumer-ref-check-2',
  checkedPublic: results.length,
  protectedConsumers,
  results,
}, null, 2));

if (failures.length) {
  console.error(`active staging public consumer refs are stale or unreadable: ${failures.join('; ')}`);
  process.exit(1);
}

if (protectedConsumers.length) {
  console.log('Protected/private consumer refs require the separate protected GitHub API verification workflow before launch authority is accepted.');
}
