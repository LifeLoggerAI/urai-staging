#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const manifest = fs.readFileSync('scripts/workstream-c-current-candidates.env', 'utf8');
const evidence = JSON.parse(fs.readFileSync('scripts/workstream-c-private-evidence.json', 'utf8'));

function readManifestSha(name) {
  const match = manifest.match(new RegExp(`^${name}='([0-9a-f]{40})'$`, 'm'));
  assert.ok(match, `missing exact ${name}`);
  return match[1];
}

assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.classification, 'exact-head-source-evidence-only-no-live-certification');
assert.equal(evidence.credentialedStagingExecution, false);
assert.equal(evidence.protectedApply, false);

const expected = {
  Analytics: {
    repository: 'LifeLoggerAI/urai-analytics',
    sha: readManifestSha('ANALYTICS_SHA'),
    requiredRuns: [29380490773, 29380490802],
  },
  Communications: {
    repository: 'LifeLoggerAI/urai-communications',
    sha: readManifestSha('COMMUNICATIONS_SHA'),
    requiredRuns: [29372754823, 29372754798],
  },
};

for (const [name, contract] of Object.entries(expected)) {
  const service = evidence.services?.[name];
  assert.ok(service, `missing ${name} evidence`);
  assert.equal(service.repository, contract.repository);
  assert.equal(service.sha, contract.sha);
  assert.match(service.sha, shaPattern);
  assert.ok(service.boundary.includes('Private repository evidence was inspected through authorized read-only connector access.'));
  assert.ok(service.boundary.includes('does not clone or re-execute this source.'));
  const runs = service.workflows ?? [];
  assert.deepEqual(runs.map((run) => run.runId).sort((a, b) => a - b), [...contract.requiredRuns].sort((a, b) => a - b));
  for (const run of runs) {
    assert.equal(run.conclusion, 'success');
    assert.ok(Number.isSafeInteger(run.runId) && run.runId > 0);
    if ('artifactId' in run) {
      assert.ok(Number.isSafeInteger(run.artifactId) && run.artifactId > 0);
      assert.match(run.artifactDigest, digestPattern);
    }
  }
}

assert.ok(evidence.services.Communications.boundary.includes('Real delivery remains disabled'));
assert.ok(evidence.services.Analytics.boundary.includes('No live deployment or persistence is certified'));

console.log('PASS: private Analytics and Communications exact-head evidence is bound without claiming clone, staging apply, live deployment, persistence or delivery');
