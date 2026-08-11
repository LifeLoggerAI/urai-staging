#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/run-workstream-c-cloud-shell-core.sh', 'utf8');

for (const marker of [
  'WORKSTREAM_C_CONTROL_REF',
  'GITHUB_HEAD_REF',
  'GITHUB_REF_NAME',
  "REPINS_PATTERN='^repin/current-(core|six-core)-candidates-[0-9]{8}$'",
  "[ \"$CONTROL_REF\" != 'workstream-c-manual-verification-20260711' ]",
  'Control ref is outside the bounded verifier authority',
  'ls-remote origin "refs/heads/$CONTROL_REF"',
  'ref=$CONTROL_REF local=$CONTROL_SHA',
  'export WORKSTREAM_C_CONTROL_REF="$CONTROL_REF"',
  'WORKSTREAM_C_CONTROL_REF="$CONTROL_REF"',
]) {
  assert.ok(source.includes(marker), `control-ref verifier missing marker: ${marker}`);
}

assert.equal(source.includes("CONTROL_BRANCH='workstream-c-manual-verification-20260711'"), false);
assert.equal(source.includes('ls-remote origin "refs/heads/$CONTROL_BRANCH"'), false);

for (const allowed of [
  'repin/current-core-candidates-20260715',
  'repin/current-six-core-candidates-20260715',
]) {
  assert.match(allowed, /^repin\/current-(core|six-core)-candidates-[0-9]{8}$/);
}
for (const rejected of [
  'repin/current-six-core-candidates-',
  'repin/current-six-core-candidates-20260715-extra',
  'feature/current-six-core-candidates-20260715',
]) {
  assert.doesNotMatch(rejected, /^repin\/current-(core|six-core)-candidates-[0-9]{8}$/);
}

console.log('PASS: bounded three-service/six-service Workstream C control refs and exact remote-head identity');
