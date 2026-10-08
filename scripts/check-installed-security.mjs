#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {installedGraph, match} from './installed-advisory-match.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const primaryCommit = 'ccd4868bd8cfbed178f5ada1194b4fe30674c25b';
const checkout = process.env.URAI_REVIEWED_ADVISORY_CHECKOUT || path.join(os.tmpdir(), `urai-reviewed-advisories-${primaryCommit}`);
const output = path.join(root, 'artifacts/launch/staging-installed-security.json');
const git = args => execFileSync('git', ['-C', checkout, ...args], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
if (!fs.existsSync(path.join(checkout, '.git'))) {
  fs.mkdirSync(checkout, {recursive: true});
  git(['init', '-q']);
  git(['remote', 'add', 'origin', 'https://github.com/github/advisory-database.git']);
  git(['sparse-checkout', 'init', '--cone']);
  git(['sparse-checkout', 'set', 'advisories/github-reviewed']);
  git(['fetch', '--depth=1', '--filter=blob:none', 'origin', primaryCommit]);
  git(['checkout', '--detach', primaryCommit]);
}
if (git(['rev-parse', 'HEAD']).trim() !== primaryCommit) throw new Error('Wrong immutable official advisory snapshot');
git(['diff', '--exit-code', 'HEAD', '--', 'advisories/github-reviewed']);
const files = git(['ls-tree', '-r', '--name-only', 'HEAD', 'advisories/github-reviewed']).trim().split('\n').sort();
function inventory(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory()
    ? inventory(path.join(dir, entry.name))
    : entry.name.endsWith('.json') ? [path.relative(checkout, path.join(dir, entry.name))] : []);
}
if (files.length !== 36576 || JSON.stringify(inventory(path.join(checkout, 'advisories/github-reviewed')).sort()) !== JSON.stringify(files)) {
  throw new Error('Complete exact official reviewed advisory inventory required');
}
const require = createRequire(path.join(root, 'functions/package.json'));
const graph = installedGraph(root, ['.', 'functions']);
const findings = [];
for (const file of files) findings.push(...match(graph, [JSON.parse(fs.readFileSync(path.join(checkout, file)))], require('semver')).findings);
const sourceSha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
// Retain every severity. Unknown official ranges or severity throw in the comparator.
// Release acceptance rejects every known reviewed vulnerability, without exclusions.
const result = {
  status: graph.problems.length || findings.length ? 'BLOCKED' : 'PASS_WITHIN_CURRENT_REVIEWED_SNAPSHOT',
  sourceSha, workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  sourceLockSha256: hash('functions/package-lock.json'),
  installedLockSha256: hash('functions/node_modules/.package-lock.json'),
  installedNodes: graph.nodes.length, graphProblems: graph.problems,
  findings, installedGraph: graph.nodes,
  primaryRepository: 'github/advisory-database', primaryCommit,
  reviewedRecords: files.length, observedAt: new Date().toISOString(),
  method: 'Every installed runtime, development, optional and peer package matched locally to the complete immutable official reviewed GitHub advisory corpus. No graph upload, exclusions, severity suppression or waivers. This certifies the pinned snapshot, not future advisories.'
};
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status: result.status, installedNodes: graph.nodes.length, graphProblems: graph.problems.length, findings: findings.map(item => ({name: item.name, version: item.version, advisory: item.advisory, severity: item.severity})), primaryCommit, reviewedRecords: files.length, output}));
process.exitCode = result.status === 'BLOCKED' ? 1 : 0;
