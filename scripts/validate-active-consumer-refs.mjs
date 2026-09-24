import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync(new URL('../config/staging-consumers.json', import.meta.url), 'utf8'));
const failures = [];
const results = [];

for (const c of doc.consumers || []) {
  if (c.state !== 'active') continue;
  const remote = `https://github.com/${c.repository}.git`;
  let stdout = '';
  try {
    stdout = execFileSync('git', ['ls-remote', '--exit-code', remote, c.sourceRef], { encoding: 'utf8' }).trim();
  } catch {
    failures.push(`${c.id}: unable to resolve ${c.repository} ${c.sourceRef}`);
    continue;
  }
  const liveSha = stdout.split(/\s+/)[0] || '';
  results.push({ id: c.id, expectedSha: c.exactSha, liveSha, sourceRef: c.sourceRef });
  if (liveSha !== c.exactSha) failures.push(`${c.id}: stale expected=${c.exactSha} live=${liveSha}`);
}

console.log(JSON.stringify({ schemaVersion: 'urai-staging-active-consumer-ref-check-1', checked: results.length, results }, null, 2));
if (failures.length) {
  console.error(`active staging consumer refs are stale: ${failures.join('; ')}`);
  process.exit(1);
}
