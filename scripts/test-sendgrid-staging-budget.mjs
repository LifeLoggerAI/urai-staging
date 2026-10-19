import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/communications-pr58-sendgrid-staging-e2e.yml', 'utf8');
const step = workflow.split('- name: Require reserved provider-mutation and cleanup budget')[1]?.split('\n      - name:')[0];
const run = step?.split('        run: |\n')[1]?.split('\n').filter(Boolean).map(line => line.replace(/^          /, '')).join('\n');
assert.ok(run, 'execute the actual workflow admission step');

function executeBudget({ initial = 1599, refreshed = 1600, failGate = '', start = '1000' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sendgrid-budget-'));
  try {
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(root, 'clock'), String(initial));
    fs.writeFileSync(path.join(root, 'env'), '');
    // Only the read-only gate processes and clock are stubbed; admission shell is unchanged.
    for (const command of ['node', 'bash', 'date']) {
      const body = command === 'date'
        ? 'cat "$TEST_BUDGET_ROOT/clock"'
        : `echo ${command} >> "$TEST_BUDGET_ROOT/gates"\nif [ "$TEST_FAIL_GATE" = '${command}' ]; then exit 9; fi\nif [ '${command}' = 'bash' ]; then echo "$TEST_REFRESHED_CLOCK" > "$TEST_BUDGET_ROOT/clock"; fi`;
      fs.writeFileSync(path.join(bin, command), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    }
    const result = spawnSync('/bin/bash', ['-c', run], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_BUDGET_ROOT: root,
        TEST_REFRESHED_CLOCK: String(refreshed), TEST_FAIL_GATE: failGate,
        SENDGRID_JOB_START_EPOCH: start, GITHUB_ENV: path.join(root, 'env') },
    });
    return { status: result.status, receipt: fs.readFileSync(path.join(root, 'env'), 'utf8'),
      gates: fs.existsSync(path.join(root, 'gates')) ? fs.readFileSync(path.join(root, 'gates'), 'utf8') : '' };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('refresh consuming the cleanup reserve refuses mutation even when setup was below the limit', () => {
  const result = executeBudget({ initial: 1599, refreshed: 1601 });
  assert.equal(result.status, 56);
  assert.equal(result.receipt, '');
  assert.equal(result.gates, 'node\nbash\n');
});
test('exact 600-second refreshed setup admits with the current elapsed receipt', () => {
  const result = executeBudget({ initial: 1550, refreshed: 1600 });
  assert.equal(result.status, 0);
  assert.equal(result.receipt, 'SENDGRID_MUTATION_ADMISSION_ELAPSED_SECONDS=600\n');
});
test('negative refreshed elapsed time refuses mutation', () => {
  const result = executeBudget({ refreshed: 999 });
  assert.equal(result.status, 56);
  assert.equal(result.receipt, '');
});
for (const failGate of ['node', 'bash']) {
  test(`${failGate} remote gate failure cannot write an admission receipt`, () => {
    const result = executeBudget({ failGate });
    assert.equal(result.status, 9);
    assert.equal(result.receipt, '');
  });
}
test('missing start marker refuses before any remote gate', () => {
  const result = executeBudget({ start: '' });
  assert.equal(result.status, 56);
  assert.equal(result.receipt, '');
  assert.equal(result.gates, '');
});
