import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Offline planning only. This module cannot deploy or mutate provider state.
export function planDiagnosticsPreservation({ version, files, expectedSourceSha, diagnostics }) {
  if (!/^[a-f0-9]{40}$/.test(expectedSourceSha ?? '')) throw new Error('Exact source SHA required');
  if (!/^((projects\/urai-staging\/)?sites\/urai-staging)\/versions\/[^/]+$/.test(version?.name ?? '') || version.status !== 'FINALIZED') {
    throw new Error('Finalized urai-staging version required');
  }
  if (!version.config || !Array.isArray(version.config.rewrites)) throw new Error('Full Hosting version config required');
  if (version.config.redirects?.length) throw new Error('Redirect precedence requires separate route review');
  if (!Array.isArray(files) || files.length !== Number(version.fileCount) || files.length < 306) throw new Error('Complete live asset inventory required');
  const paths = new Set();
  for (const file of files) {
    if (typeof file.path !== 'string' || !file.path.startsWith('/') || !/^[a-f0-9]{64}$/.test(file.hash ?? '') || paths.has(file.path)) throw new Error('Invalid or duplicate asset');
    paths.add(file.path);
  }
  const rewrites = version.config.rewrites;
  const ssr = rewrites.find(rule => rule.glob === '**' && rule.run?.serviceId === 'ssruraistaging');
  if (!ssr || ssr.run.region !== 'us-central1' || !ssr.run.tag) throw new Error('Pinned live SSR fallback required');
  for (const name of ['healthz', 'buildinfo']) {
    const receipt = diagnostics?.[name];
    if (receipt?.status !== 'ok' || receipt.projectId !== 'urai-staging' || receipt.releaseCandidateSha !== expectedSourceSha) throw new Error(`Source-bound ${name} receipt required`);
    if (paths.has(`/api/${name}`) || paths.has(`/api/${name}.html`) || paths.has(`/api/${name}/index.html`)) throw new Error('Static asset shadows diagnostic route');
  }
  const config = structuredClone(version.config);
  config.rewrites = [
    { glob: '/api/healthz', function: 'healthz', functionRegion: 'us-central1' },
    { glob: '/api/buildinfo', function: 'buildinfo', functionRegion: 'us-central1' },
    ...config.rewrites.filter(rule => !['/api/healthz', '/api/buildinfo'].includes(rule.glob)),
  ];
  const inventory = files.map(({ path, hash }) => ({ path, hash })).sort((a, b) => a.path.localeCompare(b.path));
  return {
    mode: 'review-only', sourceSha: expectedSourceSha, sourceVersion: version.name,
    assetCount: inventory.length,
    assetInventorySha256: createHash('sha256').update(JSON.stringify(inventory)).digest('hex'),
    config,
    requiredBeforeRelease: ['Re-read live version and require sourceVersion unchanged', 'Copy every original asset path/hash into the candidate version', 'Verify candidate asset inventory digest and unchanged SSR config', 'Require existing protected release gates and approvals', 'Verify both hosted diagnostic responses against sourceSha after release'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/plan-diagnostics-preservation.mjs input.json');
  process.stdout.write(`${JSON.stringify(planDiagnosticsPreservation(JSON.parse(readFileSync(input, 'utf8'))), null, 2)}\n`);
}
