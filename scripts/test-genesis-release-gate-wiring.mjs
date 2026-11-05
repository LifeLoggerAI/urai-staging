import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readScripts = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;
test('release verifier must require deploy readiness, privacy/jobs admission and actual staging evidence', () => {
  const cmd=readScripts()['verify:release'];
  assert.equal(cmd,
    'npm run check:deploy && npm run test:r422:federated:abi && npm run test:r423:worker:deletion && npm run test:r424:signed:rehearsal && npm run test:r720:privacy:completion && npm run test:r722:deletion:receipts && npm run test:r425:evidence:escrow && npm run verify:privacy-jobs:admission && npm run verify:privacy-jobs:protected && node scripts/validate-launch-evidence.mjs');
});
test('Privacy Jobs admission executable must not silently report accepted identities', () => {
  const scripts=readScripts();
  assert.equal(scripts['verify:privacy-jobs:admission'], 'node scripts/validate-privacy-jobs-staging-admission.mjs');
});
test('CI regression chain includes original, R720 and R722 deletion gates', () => {
  const scripts=readScripts();
  assert.ok(scripts.check.includes('npm run test:privacy-jobs:admission &&'));
  assert.ok(scripts.check.includes('npm run test:staging:bootstrap:execution &&'));
  assert.ok(scripts.check.includes('npm run test:r422:federated:abi &&'));
  assert.equal(scripts['test:r422:federated:abi'], 'node --test scripts/test-r422-federated-source-contract.mjs');
  assert.ok(scripts.check.includes('npm run test:r423:worker:deletion &&'));
  assert.equal(scripts['test:r423:worker:deletion'], 'node --test scripts/test-r423-worker-deletion-source-contract.mjs');
  assert.ok(scripts.check.includes('npm run test:r424:signed:rehearsal &&'));
  assert.equal(scripts['test:r424:signed:rehearsal'], 'node --test scripts/test-r424-signed-rehearsal.mjs');
  assert.equal(scripts['test:r720:privacy:completion'], 'node --test scripts/test-r720-privacy-deletion-contract.mjs');
  assert.equal(scripts['test:r722:deletion:receipts'], 'node --test scripts/test-r722-signed-deletion-receipts.mjs');
  assert.ok(scripts.check.includes('npm run test:r424:signed:rehearsal && npm run test:r720:privacy:completion && npm run test:r722:deletion:receipts && npm run test:r425:evidence:escrow &&'));
  assert.equal(scripts.check.split('npm run test:r720:privacy:completion').length, 2, 'R720 must be enrolled exactly once');
  assert.equal(scripts.check.split('npm run test:r722:deletion:receipts').length, 2, 'R722 must be enrolled exactly once');
  assert.equal(scripts['verify:privacy-jobs:protected'], 'node scripts/verify-privacy-jobs-protected-approval.mjs');
  assert.equal(scripts['test:r723:protected:approval'], 'node --test scripts/test-r723-protected-approval.mjs');
  assert.ok(scripts.check.includes('npm run test:r723:protected:approval && npm run test:genesis:release:wiring &&'));
  assert.equal(scripts.check.split('npm run test:r723:protected:approval').length, 2, 'R723 must be enrolled exactly once');
  assert.ok(scripts.check.includes('npm run test:genesis:release:wiring &&'));
  assert.ok(scripts.check.includes('npm run test:r425:evidence:escrow &&'));
  assert.equal(scripts['test:r425:evidence:escrow'], 'node --test scripts/test-r425-evidence-source-contract.mjs');
});
