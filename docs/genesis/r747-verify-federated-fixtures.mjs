#!/usr/bin/env node
/** R747: offline, deterministic integrity preflight for the four Staging fixture groups.
 * No network, npm dependencies, cloud identity, writes, or production admission.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUPS = Object.freeze([
  { name: 'R422', dir: 'r422-federated', schema: 'urai-r422-federated-source-abi-v1', environment: 'offline-synthetic-only', count: 6 },
  { name: 'R423', dir: 'r423-worker', schema: 'urai-r423-worker-source-fence-v1', environment: 'synthetic-offline-only', count: 3 },
  { name: 'R424', dir: 'r424-signed', schema: 'urai-r424-signed-rehearsal-v1', environment: 'offline-synthetic-only', count: 20 },
  { name: 'R425', dir: 'r425-evidence', schema: 'urai-r425-source-evidence-v1', environment: 'synthetic-local-only', count: 4 },
]);

const hex40 = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const blobHash = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

function confinedRegular(root, rel) {
  assert.equal(typeof rel, 'string', 'source path must be a string');
  assert.ok(rel.length > 0 && !rel.includes('\\') && !rel.includes('\0') && !rel.split('/').includes('..') && !isAbsolute(rel), `unsafe fixture path: ${rel}`);
  const normalized = relative(root, resolve(root, rel));
  assert.ok(normalized && normalized !== '..' && !normalized.startsWith(`..${sep}`) && !isAbsolute(normalized), `fixture escapes source root: ${rel}`);
  const path = join(root, normalized);
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, `untrusted fixture type: ${rel}`);
  const real = realpathSync(path);
  assert.ok(real.startsWith(root + sep), `fixture real path escaped root: ${rel}`);
  return readFileSync(real);
}

function groupEntries(group, manifest) {
  if (group.name === 'R422') {
    assert.ok(Array.isArray(manifest.entries) && manifest.entries.length === group.count, 'R422 entry count invalid');
    return manifest.entries.map(entry => {
      assert.ok(entry && /^[a-z][a-z0-9-]*$/.test(entry.id) && hex40(entry.blob) && hex40(entry.commit), 'R422 pin malformed');
      assert.match(entry.repository ?? '', /^LifeLoggerAI\/[A-Za-z0-9-]+$/, 'R422 source repository invalid');
      assert.ok(typeof entry.path === 'string' && !entry.path.includes('..'), 'R422 upstream path invalid');
      return [`${entry.id}.ts`, entry.blob];
    });
  }
  if (group.name === 'R423') {
    assert.equal(manifest.consumer, 'LifeLoggerAI/urai-jobs');
    assert.ok(hex40(manifest.commit));
    assert.ok(Array.isArray(manifest.files) && manifest.files.length === group.count, 'R423 file count invalid');
    return manifest.files.map(entry => {
      assert.ok(entry && typeof entry.path === 'string' && hex40(entry.sha), 'R423 pin malformed');
      return [entry.path, entry.sha];
    });
  }
  if (group.name === 'R424') {
    assert.ok(manifest.refs && ['jobs','privacy','studio'].every(name => hex40(manifest.refs[name])), 'R424 source refs invalid');
    assert.ok(manifest.sha && typeof manifest.sha === 'object' && !Array.isArray(manifest.sha), 'R424 pins invalid');
    return Object.entries(manifest.sha).map(([file, hash]) => [file, hash]);
  }
  assert.equal(manifest.repository, 'LifeLoggerAI/urai-jobs');
  assert.ok(hex40(manifest.commit), 'R425 commit pin malformed');
  assert.ok(manifest.pins && typeof manifest.pins === 'object' && !Array.isArray(manifest.pins), 'R425 pins invalid');
  return Object.entries(manifest.pins).map(([file, hash]) => [`scripts/${file}`, hash]);
}

export function verifyFixtureProvenance(sourceRoot = process.cwd()) {
  const root = realpathSync(resolve(sourceRoot));
  const result = [];
  for (const group of GROUPS) {
    const dir = `scripts/fixtures/${group.dir}`;
    const manifestBytes = confinedRegular(root, `${dir}/manifest.json`);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    assert.equal(manifest.schemaVersion, group.schema, `${group.name} schema drift`);
    assert.equal(manifest.environment, group.environment, `${group.name} environment drift`);
    assert.equal(manifest.productionAuthorized, false, `${group.name} production flag not false`);
    const entries = groupEntries(group, manifest);
    assert.equal(entries.length, group.count, `${group.name} pin count drift`);
    const seen = new Set();
    for (const [local, expected] of entries) {
      assert.ok(hex40(expected), `${group.name} expected Git blob invalid`);
      assert.ok(!seen.has(local), `${group.name} repeated path: ${local}`);
      seen.add(local);
      const bytes = confinedRegular(root, `${dir}/${local}`);
      assert.equal(blobHash(bytes), expected, `${group.name} fixture changed: ${local}`);
    }
    result.push({ group: group.name, verified: entries.length, manifestBlob: blobHash(manifestBytes) });
  }
  assert.equal(result.reduce((sum, g) => sum + g.verified, 0), 33);
  return { schema: 'urai-r747-offline-fixture-integrity-v1', source: root, checks: result, verified: 33, productionAuthorized: false };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyFixtureProvenance(process.argv[2] || process.cwd());
    console.log('R747_FEDERATED_FIXTURE_PROVENANCE_PASS ' + JSON.stringify(result));
  } catch (error) {
    console.error('R747_FEDERATED_FIXTURE_PROVENANCE_HOLD ' + error.message);
    process.exitCode = 1;
  }
}
