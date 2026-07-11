#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || process.cwd());
const worker = path.join(repo, 'workers', 'narrator-worker');

function read(relative) {
  const absolute = path.join(worker, relative);
  const stat = fs.lstatSync(absolute);
  assert.equal(stat.isSymbolicLink(), false, `${relative} must not be a symlink`);
  assert.equal(stat.isFile(), true, `${relative} must be a file`);
  return fs.readFileSync(absolute, 'utf8');
}

function sourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    assert.equal(stat.isSymbolicLink(), false, `Narrator source contains symlink: ${absolute}`);
    if (stat.isDirectory()) files.push(...sourceFiles(absolute));
    else if (/\.(?:ts|js)$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const pkg = JSON.parse(read('package.json'));
const tsconfig = JSON.parse(read('tsconfig.json'));
const dockerfile = read('Dockerfile');
const activeEntry = read('src/index.ts');
const sourceRoot = path.join(worker, 'src');
const activeSources = sourceFiles(sourceRoot);
const combinedSource = activeSources.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

assert.equal(pkg.main, 'dist/index.js', 'Narrator package main must be dist/index.js');
assert.match(String(pkg.scripts?.build || ''), /\btsc\b/, 'Narrator build must execute TypeScript');
assert.equal(tsconfig.compilerOptions?.rootDir, 'src', 'Narrator rootDir must be src');
assert.equal(tsconfig.compilerOptions?.outDir, 'dist', 'Narrator outDir must be dist');
assert.deepEqual(tsconfig.include, ['src/**/*.ts'], 'Narrator TypeScript input must be src/**/*.ts');
assert.match(dockerfile, /^COPY src \.\/src$/m, 'Narrator image must copy src explicitly');
assert.match(dockerfile, /^CMD \["node", "dist\/index\.js"\]$/m, 'Narrator image must run dist/index.js');
assert.doesNotMatch(dockerfile, /^COPY (?:\.\/)?index\.js\b/m, 'Legacy root index.js must not be copied');
assert.doesNotMatch(dockerfile, /^COPY \. \.$/m, 'Narrator image must not copy the whole worker directory');
assert.doesNotMatch(combinedSource, /firebase-admin/, 'Active narrator source must not reference firebase-admin');
assert.match(activeEntry, /requireWorkerAuth/, 'Narrator active entry must require bearer authentication');
assert.match(activeEntry, /app\.get\(['"]\/authz['"], requireWorkerAuth/, 'Narrator must expose the protected auth probe');
assert.match(activeEntry, /app\.post\(['"]\/execute-job['"], requireWorkerAuth/, 'Narrator mutation route must require bearer authentication');

console.log(JSON.stringify({
  ok: true,
  packageMain: pkg.main,
  build: pkg.scripts.build,
  sourceFileCount: activeSources.length,
  dockerCopiesLegacyRootIndex: false,
  activeSourceUsesFirebaseAdmin: false,
  authzProtected: true,
  executeJobProtected: true,
}, null, 2));
