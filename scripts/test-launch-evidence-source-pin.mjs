#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validator = fileURLToPath(new URL('./validate-launch-evidence.mjs', import.meta.url));
function put(root, relative, value) {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}
const run = (cwd) => spawnSync(process.execPath, [validator], { cwd, encoding: 'utf8' });

test('staging launch evidence binds current Git HEAD and rejects stale/unverifiable heads', () => {
  const root = mkdtempSync(join(tmpdir(), 'urai-launch-sha-regression-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', ['-C', root, 'config', 'user.email', 'genesis-test@example.invalid']);
    execFileSync('git', ['-C', root, 'config', 'user.name', 'Genesis Synthetic Test']);
    put(root, 'README.md', 'synthetic fixture only');
    execFileSync('git', ['-C', root, 'add', 'README.md']);
    execFileSync('git', ['-C', root, 'commit', '-qm', 'synthetic fixture']);
    const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const commands = [{ command: 'synthetic checks', status: 'passed', exitCode: 0 }];
    const report = {
      repo: 'LifeLoggerAI/urai-staging', kind: 'staging-bootstrap', sourceSha: head,
      projectId: 'urai-staging', environment: 'staging', productionAllowed: false,
      cloudDeploymentPerformed: false, liveSmokePerformed: false,
      providerMutationPerformed: false, activeConsumers: [], commands,
      status: 'passed', commandCount: 1, passedCount: 1, failedCount: 0,
      sourceBootstrapScore: 100,
    };
    const security = {
      sourceSha: head, status: 'PASS_WITHIN_CURRENT_REVIEWED_SNAPSHOT',
      primaryCommit: 'ccd4868bd8cfbed178f5ada1194b4fe30674c25b',
      reviewedRecords: 36576, findings: [], graphProblems: [], installedNodes: 1,
    };
    const summary = [
      '- Exact source SHA: ' + head, '- Project: urai-staging',
      '- Environment: staging', '- Production allowed: false',
      '- Cloud deployment performed: false', '- Live smoke performed: false',
      '- Provider mutation performed: false', '- Status: passed',
      '- Source bootstrap score: 100/100', '- Passed commands: 1',
      '- Failed commands: 0', '- Total commands: 1',
    ].join('\n');
    put(root, 'config/staging-consumers.json', { consumers: [] });
    put(root, 'artifacts/launch/staging-bootstrap-report.json', report);
    put(root, 'artifacts/launch/staging-installed-security.json', security);
    put(root, 'artifacts/launch/staging-bootstrap-summary.md', summary);

    const valid = run(root);
    assert.equal(valid.status, 0, valid.stderr);
    // Matching Git HEAD alone cannot authenticate a dirty source checkout.
    // Reject both unstaged and staged edits while retaining the original
    // clean-head, stale-report and missing-Git acceptance cases.
    put(root, 'README.md', 'changed after the recorded Git commit');
    const dirty = run(root);
    assert.equal(dirty.status, 1);
    assert.match(dirty.stderr, /Checked-out tracked source differs from the exact Git HEAD/);
    execFileSync('git', ['-C', root, 'add', 'README.md']);
    const stagedDirty = run(root);
    assert.equal(stagedDirty.status, 1);
    assert.match(stagedDirty.stderr, /Checked-out tracked source differs from the exact Git HEAD/);
    execFileSync('git', ['-C', root, 'restore', '--staged', 'README.md']);
    execFileSync('git', ['-C', root, 'restore', 'README.md']);
    const restored = run(root);
    assert.equal(restored.status, 0, restored.stderr);

    const stale = 'a'.repeat(40);
    report.sourceSha = stale;
    security.sourceSha = stale;
    put(root, 'artifacts/launch/staging-bootstrap-report.json', report);
    put(root, 'artifacts/launch/staging-installed-security.json', security);
    put(root, 'artifacts/launch/staging-bootstrap-summary.md', summary.replaceAll(head, stale));
    const mismatched = run(root);
    assert.equal(mismatched.status, 1);
    assert.match(mismatched.stderr, /does not match exact checked-out Git HEAD/);

    // Matching stale report and security hashes must not become valid if Git
    // cannot be consulted. The validator must deny, not silently skip identity.
    rmSync(join(root, '.git'), { recursive: true, force: true });
    const unverifiable = run(root);
    assert.equal(unverifiable.status, 1);
    assert.match(unverifiable.stderr, /Cannot independently verify checked-out Git HEAD/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
