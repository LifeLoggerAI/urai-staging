import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readScripts = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
test('release verifier must require deploy readiness, privacy/jobs admission and actual staging evidence', () => {
  const cmd=readScripts()['verify:release'];
  assert.equal(cmd,
    'npm run check:deploy && npm run test:r422:federated:abi && npm run test:r423:worker:deletion && npm run test:r424:signed:rehearsal && npm run verify:privacy-jobs:admission && node scripts/validate-launch-evidence.mjs');
});
test('Privacy Jobs admission executable must not silently report accepted identities', () => {
  const scripts=readScripts();
  assert.equal(scripts['verify:privacy-jobs:admission'], 'node scripts/validate-privacy-jobs-staging-admission.mjs');
});
test('CI regression chain must still test the two new guards', () => {
  const scripts=readScripts();
  assert.ok(scripts.check.includes('npm run test:privacy-jobs:admission &&'));
  assert.ok(scripts.check.includes('npm run test:staging:bootstrap:execution &&'));
  assert.ok(scripts.check.includes('npm run test:r422:federated:abi &&'));
  assert.equal(scripts['test:r422:federated:abi'], 'node --test scripts/test-r422-federated-source-contract.mjs');
  assert.ok(scripts.check.includes('npm run test:r423:worker:deletion &&'));
  assert.equal(scripts['test:r423:worker:deletion'], 'node --test scripts/test-r423-worker-deletion-source-contract.mjs');
  assert.ok(scripts.check.includes('npm run test:r424:signed:rehearsal &&'));
  assert.equal(scripts['test:r424:signed:rehearsal'], 'node --test scripts/test-r424-signed-rehearsal.mjs');
});
