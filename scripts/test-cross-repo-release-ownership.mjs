#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const load = () => ({
  map: read('../CROSS_REPO_RELEASE_MAP.md'),
  readme: read('../README.md'),
  doctor: read('./repo-doctor.mjs'),
  consumers: JSON.parse(read('../config/staging-consumers.json')),
  pkg: JSON.parse(read('../package.json')),
});

function assertReleaseOwnership({map, readme, doctor, consumers, pkg}) {
  assert.ok(typeof map === 'string' && map.startsWith('# URAI Cross-Repo Release Map'), 'missing canonical map');
  const roles = [
    ['Canonical public consumer', 'LifeLoggerAI/urai-spatial', 'urai-tier1', 'https://urai.app'],
    ['Firebase staging backend', 'LifeLoggerAI/urai-staging', '.', 'https://urai-staging.web.app'],
    ['Life Movie consent authority', 'LifeLoggerAI/urai-privacy', 'functions', 'Protected callable only'],
    ['Jobs and governed workers', 'LifeLoggerAI/urai-jobs', 'functions', 'Protected worker only'],
    ['Private media Studio', 'LifeLoggerAI/urai-studio', '.', 'Private media only'],
    ['Legacy/reference only', 'LifeLoggerAI/UrAi', 'historical', 'none'],
  ];
  const actual = map.split('\n').filter(line => /^\| [^|-]/.test(line)).map(line =>
    line.split('|').slice(1, 6).map(s => s.trim().replace(/^`|`$/g, '')));
  for (const [role, owner, root, target] of roles) {
    const matches = actual.filter(row => row[0] === role);
    assert.equal(matches.length, 1, `missing/duplicated release role: ${role}`);
    assert.deepEqual(matches[0].slice(0, 4), [role, owner, root, target], `wrong owner or target for ${role}`);
  }
  assert.equal(new Set(actual.map(row => row[0])).size, actual.length, 'release map has duplicate roles');
  assert.ok(map.includes('NO-GO / HOLD'), 'release map must deny automatic GO');
  assert.ok(map.includes('scoped allowlist, not proof that every UrAi repository is integrated or deployed'),
    'active staging consumer registry cannot imply entire estate integrated');
  assert.ok(map.includes('LifeLoggerAI/urai-spatial/issues/863'), 'Home founder acceptance gate missing');
  assert.ok(map.includes('LifeLoggerAI/urai-staging/issues/116'), 'integrated release tracker missing');
  assert.ok(map.includes('historical'), 'legacy app must be historical only');
  assert.doesNotMatch(map, /product Core Web surface is tracked separately in `LifeLoggerAI\/UrAi`/i);
  assert.ok(readme.includes('Production public-product authority belongs to `LifeLoggerAI/urai-spatial`'),
    'README must name canonical production app');
  assert.ok(doctor.includes('LifeLoggerAI/urai-spatial/urai-tier1'),
    'operator doctor must point to the canonical app');
  assert.doesNotMatch(doctor, /For full product V1 checks, cd into LifeLoggerAI\/UrAi\b/,
    'operator doctor cannot instruct production use of quarantined UrAi');
  assert.equal(consumers.projectId, 'urai-staging');
  assert.equal(consumers.environment, 'staging');
  assert.equal(consumers.productionAllowed, false, 'staging may never authorize production');
  assert.ok(Array.isArray(consumers.consumers), 'consumer registry must be valid array');
  const active = consumers.consumers.filter(x => x?.state === 'active');
  assert.ok(active.length > 0, 'staging active consumer registry must not silently disappear');
  const ids = new Set();
  for (const entry of active) {
    assert.ok(typeof entry.id === 'string' && entry.id.length > 2 && !ids.has(entry.id), 'duplicate or empty consumer ID');
    ids.add(entry.id);
    assert.match(entry.repository ?? '', /^LifeLoggerAI\/[A-Za-z0-9._-]+$/, 'unknown consumer repository');
    assert.notEqual(entry.repository, 'LifeLoggerAI/UrAi', 'legacy product cannot be active staging consumer');
    assert.match(entry.exactSha ?? '', /^[0-9a-f]{40}$/, 'active consumer must pin source SHA');
    assert.equal(entry.allowedEnvironment, 'staging', 'active consumer escaped staging');
    assert.equal(entry.providerProject, 'urai-staging', 'active consumer project mismatch');
    assert.equal(entry.productionDeploymentAuthorized, false, 'consumer gained production deployment');
    assert.equal(entry.productionDataAuthorized, false, 'consumer gained production data');
    assert.equal(entry.longLivedCredentialsAuthorized, false, 'consumer gained long-lived credentials');
  }
  assert.equal(pkg.scripts['test:release-ownership'], 'node --test scripts/test-cross-repo-release-ownership.mjs');
  assert.match(pkg.scripts['check'], /npm run test:release-ownership/, 'canonical check must include ownership test');
  return true;
}

const mutate = (f) => { const x = load(); f(x); assert.throws(() => assertReleaseOwnership(x)); };
test('current source owns Spatial product and staging-only backend', () => assertReleaseOwnership(load()));
test('rejects public product owner drift to legacy UrAi', () => mutate(x => {x.map=x.map.replace('| Canonical public consumer | `LifeLoggerAI/urai-spatial`', '| Canonical public consumer | `LifeLoggerAI/UrAi`');}));
test('rejects public runtime root drift', () => mutate(x => {x.map=x.map.replace('| `urai-tier1` |', '| `src` |');}));
test('rejects staging Firebase target drift', () => mutate(x => {x.map=x.map.replace('| `https://urai-staging.web.app` |', '| `https://urai.app` |');}));
test('rejects missing independent Home acceptance tracker', () => mutate(x => {x.map=x.map.replace('LifeLoggerAI/urai-spatial/issues/863','LifeLoggerAI/urai-spatial/issues/0');}));
test('rejects false global GO in ownership map', () => mutate(x => {x.map=x.map.replace('NO-GO / HOLD','GO / LIVE');}));
test('rejects deleting the scoped consumer caveat', () => mutate(x => {x.map=x.map.replace('scoped allowlist, not proof that every UrAi repository is integrated or deployed','all 19 live');}));
test('rejects missing legacy quarantine row', () => mutate(x => {x.map=x.map.replace('| Legacy/reference only |', '| Canonical production owner |');}));
test('rejects operator instructions pointing to legacy UrAi', () => mutate(x => {x.doctor=x.doctor.replace('LifeLoggerAI/urai-spatial/urai-tier1','LifeLoggerAI/UrAi');}));
test('rejects README canonical authority drift', () => mutate(x => {x.readme=x.readme.replace('Production public-product authority belongs to `LifeLoggerAI/urai-spatial`','Production public-product authority belongs to `LifeLoggerAI/UrAi`');}));
test('rejects staging production authorization', () => mutate(x => {x.consumers.productionAllowed=true;}));
test('rejects active consumer in production environment', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').allowedEnvironment='production';}));
test('rejects active consumer selecting production project', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').providerProject='urai-4dc1d';}));
test('rejects active consumer production data authorization', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').productionDataAuthorized=true;}));
test('rejects staging grant of long-lived credentials', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').longLivedCredentialsAuthorized=true;}));
test('rejects active quarantined legacy product consumer', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').repository='LifeLoggerAI/UrAi';}));
test('rejects unpinned active consumer', () => mutate(x => {x.consumers.consumers.find(e=>e.state==='active').exactSha='main';}));
test('rejects a duplicate role', () => mutate(x => {x.map+='\n| Canonical public consumer | `LifeLoggerAI/urai-spatial` | `urai-tier1` | `https://urai.app` | Fake |\n';}));
test('rejects removal of the gate from the root check', () => mutate(x => {x.pkg.scripts.check='npm run lint';}));
