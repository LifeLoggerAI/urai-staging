import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const paths = [
  '.github/workflows/ci.yml',
  '.github/workflows/urai-production-verify.yml',
  '.github/workflows/staging-deploy.yml',
];
const orderedGates = Object.freeze([
  'node --test scripts/test-r887-release-acceptance-wiring.mjs',
  'npm run test:r816:capacity',
  'npm --prefix functions run test:synthetic-lifecycle:http-emulator',
]);

function missingOrRepeatedOrOutOfOrder(source) {
  let preceding = -1;
  const errors = [];
  for (const command of orderedGates) {
    const first = source.indexOf(command);
    if (first < 0) errors.push('missing: ' + command);
    else if (source.indexOf(command, first + command.length) >= 0) errors.push('duplicate: ' + command);
    else if (first <= preceding) errors.push('out-of-order: ' + command);
    preceding = first;
  }
  return errors;
}

test('original R840 checks must be enrolled in all three release paths exactly once in order', () => {
  for (const path of paths)
    assert.deepEqual(missingOrRepeatedOrOutOfOrder(read(path)), [], path);
});

test('missing, repeated and reordered checks are rejected, never silently omitted', () => {
  const clean = orderedGates.join('\n');
  assert.deepEqual(missingOrRepeatedOrOutOfOrder(clean), []);
  for (const command of orderedGates) {
    assert.ok(missingOrRepeatedOrOutOfOrder(clean.replace(command, 'echo synthetic-pass')).length);
    assert.ok(missingOrRepeatedOrOutOfOrder(clean + '\n' + command).length);
  }
  assert.ok(missingOrRepeatedOrOutOfOrder([...orderedGates].reverse().join('\n')).length);
});

test('enrolled commands execute original Functions scripts with bounded disposable emulators', () => {
  const pkg = JSON.parse(read('package.json'));
  const fn = JSON.parse(read('functions/package.json'));
  assert.equal(pkg.scripts['test:r816:capacity'],
    'node --test functions/test/syntheticMemoryCapacity.test.mjs');
  assert.ok(fn.scripts['test:synthetic-lifecycle:http-emulator'].includes(
    'GCLOUD_PROJECT=urai-staging-test firebase emulators:exec'));
  assert.ok(fn.scripts['test:synthetic-lifecycle:http-emulator'].includes(
    '--project urai-staging-test --only auth,firestore,storage'));
  assert.ok(fn.scripts['test:synthetic-lifecycle:http-emulator'].includes(
    'node test/syntheticMemoryLifecycle.http-emulator.mjs'));
  assert.equal(read('firebase.json').includes('"production"'), false);
});

test('staging deploy remains manual and production-disabled; preflight is ahead of credentials', () => {
  const workflow = read('.github/workflows/staging-deploy.yml');
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(workflow.includes("URAI_PRODUCTION_DEPLOY_APPROVED: '0'"));
  assert.ok(workflow.includes('if: ${{ inputs.run_live_deploy }}'));
  const lastAcceptance = workflow.indexOf(orderedGates[2]);
  const seal = workflow.indexOf('node scripts/staging-prebuilt-manifest.mjs --write');
  const wif = workflow.indexOf('google-github-actions/auth@');
  assert.ok(lastAcceptance >= 0 && seal > lastAcceptance && wif > seal);
  assert.equal(workflow.includes('push:\n'), false);
});
