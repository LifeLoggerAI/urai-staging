#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const helper = 'scripts/resolve-workstream-c-root.mjs';
const suffix = `${process.pid}-${Date.now()}`;
const valid = `/tmp/urai-workstream-c-manual-valid-${suffix}`;
const file = `/tmp/urai-workstream-c-manual-file-${suffix}`;
const link = `/tmp/urai-workstream-c-manual-link-${suffix}`;
const target = `/tmp/urai-workstream-c-target-${suffix}`;
const paths = [valid, file, link, target];

function run(root, stamp = `test-${suffix}`) {
  const env = { ...process.env };
  if (root === undefined) delete env.WORKSTREAM_C_ROOT;
  else env.WORKSTREAM_C_ROOT = root;
  return spawnSync(process.execPath, [helper, stamp], { encoding: 'utf8', env });
}

function expectPass(root, expected) {
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected);
}

function expectFail(root, message) {
  const result = run(root);
  assert.notEqual(result.status, 0, `Expected failure for ${root}`);
  assert.match(result.stderr, message);
}

try {
  expectPass(undefined, `/tmp/urai-workstream-c-manual-test-${suffix}`);
  expectPass(valid, valid);
  expectFail(`/var/tmp/urai-workstream-c-manual-${suffix}`, /directly below \/tmp/);
  expectFail(`/tmp/not-urai-workstream-c-${suffix}`, /must use the urai-workstream-c-manual- prefix/);

  fs.writeFileSync(file, 'not a directory');
  expectFail(file, /must be a real directory/);

  fs.mkdirSync(target, { mode: 0o700 });
  fs.symlinkSync(target, link, 'dir');
  expectFail(link, /must be a real directory/);

  console.log('OK: Workstream C workspace resolver is fail-closed.');
} finally {
  for (const candidate of paths) {
    if (candidate.startsWith('/tmp/urai-workstream-c-')) {
      fs.rmSync(candidate, { recursive: true, force: true });
    }
  }
}
