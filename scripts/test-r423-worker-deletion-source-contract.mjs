import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const fixtureRoot = fileURLToPath(new URL('./fixtures/r423-worker/', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('./fixtures/r423-worker/manifest.json', import.meta.url), 'utf8'));
const expected = Object.freeze({
  'workers/studio-worker/index.js': 'e37d15b79fc986554943efd9aedd2edd814f88e9',
  'functions/src/privacy/ownerDeletionFence.ts': '3501db8b6a5cbc4ddcf038fcf00e0a7a8574eb33',
  'scripts/life-movies-worker-owner-deletion-fence.test.mjs': '3fa1127e0aba6928b9045dd9eaca87d30160fc80'
});
function verifyFixtures() {
  assert.equal(manifest.schemaVersion, 'urai-r423-worker-source-fence-v1');
  assert.equal(manifest.environment, 'synthetic-offline-only');
  assert.equal(manifest.productionAuthorized, false);
  assert.equal(manifest.consumer, 'LifeLoggerAI/urai-jobs');
  assert.equal(manifest.commit, 'dbe75780ba5f540f0c874990207a33173b60ec1c');
  assert.equal(manifest.files.length, Object.keys(expected).length);
  assert.equal(new Set(manifest.files.map(f => f.path)).size, manifest.files.length);
  for (const file of manifest.files) {
    assert.equal(file.sha, expected[file.path], 'unreviewed source path or blob');
    const bytes = readFileSync(new URL('./fixtures/r423-worker/' + file.path, import.meta.url));
    const actual = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(actual, file.sha, 'original Jobs source drifted: ' + file.path);
  }
}
test('R423 worker fixtures match exact immutable Jobs source', () => {
  verifyFixtures();
});
test('R423 original render-worker deletion fence suite passes without cloud access', () => {
  verifyFixtures();
  const child = spawnSync(process.execPath, [
    '--test', 'scripts/life-movies-worker-owner-deletion-fence.test.mjs'
  ], {
    cwd: fixtureRoot, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024,
    env: { PATH: process.env.PATH || '', HOME: process.env.HOME || '/tmp', CI: '1' }
  });
  assert.equal(child.error, undefined, String(child.error));
  assert.equal(child.status, 0, 'Original-source tests failed:\n' + String(child.stdout) + '\n' + String(child.stderr));
  assert.match(child.stdout, /# tests 20(?:\r?\n)/);
  assert.match(child.stdout, /# pass 20(?:\r?\n)/);
  assert.match(child.stdout, /# fail 0(?:\r?\n)/);
  assert.match(child.stdout, /# skipped 0(?:\r?\n)/);
});
