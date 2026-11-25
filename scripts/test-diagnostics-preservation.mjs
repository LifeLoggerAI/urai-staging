import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDiagnosticsPreservation as plan } from './plan-diagnostics-preservation.mjs';

function fixture() {
  const receipt = { status: 'ok', projectId: 'urai-staging', releaseCandidateSha: 'a'.repeat(40) };
  return {
    expectedSourceSha: receipt.releaseCandidateSha,
    diagnostics: { healthz: { ...receipt }, buildinfo: { ...receipt } },
    version: { name: 'sites/urai-staging/versions/original', status: 'FINALIZED', fileCount: '306', config: {
      headers: [{ glob: '**', headers: { 'X-Test': 'preserved' } }],
      rewrites: [{ glob: '**', run: { serviceId: 'ssruraistaging', region: 'us-central1', tag: 'fh-original' } }],
    } },
    files: Array.from({ length: 306 }, (_, index) => ({ path: `/asset-${index}.js`, hash: 'b'.repeat(64) })),
  };
}
test('preserves every asset and complete config, inserting diagnostics before pinned SSR', () => {
  const input = fixture(); const original = structuredClone(input); const result = plan(input);
  assert.deepEqual(input, original);
  assert.equal(result.assetCount, 306);
  assert.deepEqual(result.config.headers, input.version.config.headers);
  assert.deepEqual(result.config.rewrites[2], input.version.config.rewrites[0]);
  assert.equal(result.config.rewrites[0].glob, '/api/healthz');
  assert.equal(plan({ ...input, files: [...input.files].reverse() }).assetInventorySha256, result.assetInventorySha256);
});
for (const [name, mutate] of [
  ['missing assets', x => x.files.pop()],
  ['duplicate assets', x => x.files[1] = x.files[0]],
  ['wrong source', x => x.diagnostics.buildinfo.releaseCandidateSha = 'c'.repeat(40)],
  ['unbound health', x => delete x.diagnostics.healthz.releaseCandidateSha],
  ['summarized config', x => delete x.version.config],
  ['unpinned SSR', x => delete x.version.config.rewrites[0].run.tag],
  ['wrong project', x => x.version.name = 'sites/production/versions/a'],
  ['shadowed diagnostic', x => x.files[0].path = '/api/healthz'],
  ['directory index shadow', x => x.files[0].path = '/api/healthz/index.html'],
  ['build directory index shadow', x => x.files[0].path = '/api/buildinfo/index.html'],
  ['redirect precedence', x => x.version.config.redirects = [{ glob: '**', location: '/elsewhere', statusCode: 302 }]],
]) test(`rejects ${name}`, () => { const input = fixture(); mutate(input); assert.throws(() => plan(input)); });
