import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'firebase.json'), 'utf8'));

test('deploy preflight resolves both staging diagnostic rewrites in order', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'staging-diagnostic-routes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const entry of await readdir(root)) {
    if (entry !== 'firebase.json' && entry !== '.git') await symlink(join(root, entry), join(dir, entry));
  }
  const cases = [
    ['canonical order', routes => routes, true],
    ['missing healthz', routes => routes.filter(r => r.source !== '/api/healthz'), false],
    ['wrong buildinfo target', routes => routes.map(r => r.source === '/api/buildinfo' ? { ...r, function: 'companion' } : r), false],
    ['SPA first', routes => [routes.at(-1), ...routes.slice(0, -1)], false],
    ['API glob first', routes => [{source: '/api/**', destination: '/index.html'}, ...routes], false],
    ['disjoint glob first', routes => [{source: '/assets/**', destination: '/index.html'}, ...routes], true],
  ];
  for (const [name, rewrite, accepted] of cases) {
    await t.test(name, async () => {
      const candidate = structuredClone(config);
      candidate.hosting.rewrites = rewrite(candidate.hosting.rewrites);
      await writeFile(join(dir, 'firebase.json'), JSON.stringify(candidate));
      const result = run(process.execPath, [join(root, 'scripts/check-deploy-readiness-v2.mjs')], { cwd: dir });
      if (accepted) assert.match((await result).stdout, /semantic deploy readiness passed/);
      else await assert.rejects(result, error => error.code === 1 && error.stderr.includes('semantic deploy readiness failed'));
    });
  }
});

test('release smoke verifies the first public HTTP response of each staging diagnostic', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'staging-diagnostic-http-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const sha = 'a'.repeat(40);
  const timestamp = '2026-01-01T00:00:00.000Z';
  let fixture = {};
  let hostingUrl;
  const server = createServer((req, res) => {
    const reply = (status, type, value, extra = {}) => {
      res.writeHead(status, { 'Content-Type': type, ...extra });
      res.end(typeof value === 'string' ? value : JSON.stringify(value));
    };
    if (req.url === '/') return reply(200, 'text/html', '<meta name="robots" content="noindex,nofollow">');
    if (req.url === '/robots.txt') return reply(200, 'text/plain', 'User-agent: *\nDisallow: /\n');
    if (req.url === '/api/healthz' || req.url === '/api/buildinfo') {
      const value = { status: 'ok', service: 'urai-staging', projectId: 'urai-staging', hostingUrl };
      if (req.url === '/api/buildinfo') {
        Object.assign(value, { releaseCandidateSha: sha, deployedAt: timestamp, deploymentWorkflowRunId: '1', runtimeProjectId: 'urai-staging' });
      }
      if (fixture.route === req.url) {
        if (fixture.redirect) return reply(302, 'text/plain', '', { Location: '/api/buildinfo' });
        return reply(200, fixture.type ?? 'application/json', { ...value, ...fixture.fields });
      }
      return reply(200, 'application/json; charset=utf-8', value);
    }
    if (req.method === 'POST' && (req.url === '/api/companion' || req.url === '/api/waitlist')) {
      const code = req.headers.origin ? 403 : Number(req.headers['content-length']) > 8192 ? 413 : 400;
      return reply(code, 'application/json', { status: 'error' });
    }
    return reply(404, 'text/plain', '');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  hostingUrl = 'http://127.0.0.1:' + server.address().port;
  const receipt = join(dir, 'mutation.json');
  await writeFile(receipt, JSON.stringify({ schemaVersion: 'urai-staging-mutation-2', sourceSha: sha,
    projectId: 'urai-staging', hostingUrl, deploymentCommandCompleted: true, deployedAt: timestamp, workflowRunId: '1' }));
  const env = { ...process.env, NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1',
    URAI_STAGING_PROJECT_ID: 'urai-staging', URAI_STAGING_URL: hostingUrl,
    URAI_RELEASE_CANDIDATE_SHA: sha, URAI_STAGING_MUTATION_RECEIPT: receipt };
  const cases = [
    ['matching diagnostics', {}, null],
    ['wrong health service', { route: '/api/healthz', fields: { service: 'other-service', internal: 'fixture-body-marker' } }, /identity did not match/],
    ['wrong build project', { route: '/api/buildinfo', fields: { projectId: 'other-project' } }, /identity did not match|projectId must be urai-staging/],
    ['health with incorrect media type', { route: '/api/healthz', type: 'text/plain' }, /Expected application\/json/],
    ['redirected health', { route: '/api/healthz', redirect: true }, /received HTTP 302/],
    ['unknown build source', { route: '/api/buildinfo', fields: { releaseCandidateSha: 'unknown' } }, /releaseCandidateSha must equal exact candidate/],
  ];
  for (const [name, inputs, expectedError] of cases) {
    await t.test(name, async () => {
      fixture = inputs;
      const result = run('bash', [join(root, 'scripts/smoke-staging.sh')], { cwd: root, env, timeout: 10000 });
      if (!expectedError) return assert.match((await result).stdout, /non-mutating live smoke passed/);
      await assert.rejects(result, error => error.code === 1 && expectedError.test(error.stderr) &&
        !(error.stdout + error.stderr).includes('fixture-body-marker'));
    });
  }
});
