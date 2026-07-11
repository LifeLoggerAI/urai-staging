#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const artifactRoot = path.resolve(process.env.URAI_STAGING_PREBUILT_ROOT || repoRoot);
const manifestRelativePath = 'artifacts/prebuilt/staging-prebuilt-manifest.json';
const manifestPath = path.join(artifactRoot, manifestRelativePath);
const sourceControlledFiles = [
  '.firebaserc',
  'firebase.json',
  'firestore.indexes.json',
  'firestore.rules',
  'functions/package-lock.json',
  'functions/package.json',
  'storage.rules',
];
const managedRoots = ['functions/lib', 'public'];
const allowedGeneratedPrefixes = [
  'artifacts/launch/',
  'artifacts/prebuilt/',
  'functions/lib/',
  'public/',
];
const modes = {
  write: process.argv.includes('--write'),
  verifyExternal: process.argv.includes('--verify-external'),
  materialize: process.argv.includes('--materialize'),
  verifyMaterialized: process.argv.includes('--verify-materialized'),
};
if (Object.values(modes).filter(Boolean).length !== 1) {
  throw new Error('Choose exactly one staging prebuilt mode.');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function gitText(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function exactSourceIdentity() {
  const expected = String(process.env.URAI_RELEASE_CANDIDATE_SHA || '').trim();
  const actual = gitText('rev-parse', 'HEAD');
  if (!/^[0-9a-f]{40}$/.test(expected) || actual !== expected) {
    throw new Error(`Staging prebuilt source mismatch: expected=${expected || '<missing>'} actual=${actual}`);
  }
  const sourceTreeSha = gitText('rev-parse', 'HEAD^{tree}');
  if (!/^[0-9a-f]{40}$/.test(sourceTreeSha)) throw new Error('Invalid Git source tree SHA.');
  return { sourceSha: actual, sourceTreeSha };
}

function assertReviewedSourceUnchanged() {
  try {
    execFileSync('git', ['diff', '--exit-code', '--', '.'], { cwd: repoRoot, stdio: 'pipe' });
    execFileSync('git', ['diff', '--cached', '--exit-code', '--', '.'], { cwd: repoRoot, stdio: 'pipe' });
  } catch {
    throw new Error('Tracked source changed after verification; refusing to seal staging artifact.');
  }

  const raw = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const untracked = raw.split('\0').filter(Boolean).map((value) => value.split(path.sep).join('/'));
  const unexpected = untracked.filter(
    (file) => !allowedGeneratedPrefixes.some((prefix) => file.startsWith(prefix)),
  );
  if (unexpected.length) {
    throw new Error(`Unexpected untracked staging build inputs or residue: ${unexpected.join(', ')}`);
  }
}

function addPath(baseRoot, relative, files) {
  const absolute = path.join(baseRoot, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Missing staging prebuilt path: ${relative}`);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Staging prebuilt path is a symlink: ${relative}`);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolute).sort()) {
      addPath(baseRoot, path.posix.join(relative.split(path.sep).join('/'), entry), files);
    }
    return;
  }
  if (!stat.isFile()) throw new Error(`Unsupported staging prebuilt path type: ${relative}`);
  const bytes = fs.readFileSync(absolute);
  files.push({ path: relative.split(path.sep).join('/'), size: bytes.length, sha256: sha256(bytes) });
}

function collect(baseRoot) {
  const files = [];
  for (const relative of [...sourceControlledFiles, ...managedRoots]) addPath(baseRoot, relative, files);
  files.sort((left, right) => left.path.localeCompare(right.path));
  if (!files.length) throw new Error('Staging prebuilt artifact is empty.');
  return files;
}

function totals(files) {
  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  };
}

function readVerifiedManifest(baseRoot, identity) {
  const candidateManifestPath = path.join(baseRoot, manifestRelativePath);
  if (!fs.existsSync(candidateManifestPath)) throw new Error(`Missing staging prebuilt manifest: ${candidateManifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(candidateManifestPath, 'utf8'));
  const files = collect(baseRoot);
  const summary = totals(files);
  const failures = [];
  if (manifest.schemaVersion !== 'urai-staging-prebuilt-2') failures.push('schema');
  if (manifest.repository !== (process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-staging')) failures.push('repository');
  if (manifest.sourceSha !== identity.sourceSha) failures.push('source SHA');
  if (manifest.sourceTreeSha !== identity.sourceTreeSha) failures.push('source tree SHA');
  if (process.env.GITHUB_RUN_ID && manifest.workflowRunId !== process.env.GITHUB_RUN_ID) failures.push('workflow run');
  if (JSON.stringify(manifest.sourceControlledFiles) !== JSON.stringify(sourceControlledFiles)) failures.push('source file contract');
  if (JSON.stringify(manifest.managedRoots) !== JSON.stringify(managedRoots)) failures.push('managed roots');
  if (JSON.stringify(manifest.allowedGeneratedPrefixes) !== JSON.stringify(allowedGeneratedPrefixes)) failures.push('generated-output confinement');
  if (JSON.stringify(manifest.files) !== JSON.stringify(files)) failures.push('file set, size, or hash');
  if (manifest.fileCount !== summary.fileCount || manifest.totalBytes !== summary.totalBytes) failures.push('totals');
  if (failures.length) throw new Error(`Staging prebuilt verification failed: ${failures.join(', ')}`);
  return { manifest, files, summary, manifestPath: candidateManifestPath };
}

function compareControlledSourceToArtifact(identity) {
  const external = readVerifiedManifest(artifactRoot, identity);
  const externalMap = new Map(external.files.map((file) => [file.path, file]));
  const local = [];
  for (const relative of [...sourceControlledFiles, 'public']) addPath(repoRoot, relative, local);
  for (const file of local) {
    const expected = externalMap.get(file.path);
    if (!expected || expected.size !== file.size || expected.sha256 !== file.sha256) {
      throw new Error(`Checked-out staging source does not match prebuilt artifact: ${file.path}`);
    }
  }
  return external;
}

function copyTree(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Refusing to materialize symlink: ${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) copyTree(path.join(source, entry), path.join(destination, entry));
    return;
  }
  if (!stat.isFile()) throw new Error(`Unsupported materialization source: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
}

const identity = exactSourceIdentity();

if (modes.write) {
  if (artifactRoot !== repoRoot) throw new Error('--write must run against repository outputs.');
  assertReviewedSourceUnchanged();
  const files = collect(repoRoot);
  const summary = totals(files);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = {
    schemaVersion: 'urai-staging-prebuilt-2',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-staging',
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    sourceSha: identity.sourceSha,
    sourceTreeSha: identity.sourceTreeSha,
    sourceStateVerifiedClean: true,
    authorityScope: 'urai-staging-repository-only',
    consumerAssignments: [],
    crossSystemMutationAuthorized: false,
    sourceControlledFiles,
    managedRoots,
    allowedGeneratedPrefixes,
    files,
    ...summary,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'WROTE', ...identity, manifestPath, ...summary }, null, 2));
} else if (modes.verifyExternal) {
  if (artifactRoot === repoRoot) throw new Error('--verify-external requires URAI_STAGING_PREBUILT_ROOT outside the repository.');
  const verified = compareControlledSourceToArtifact(identity);
  console.log(JSON.stringify({ status: 'PASS', ...identity, artifactRoot, ...verified.summary }, null, 2));
} else if (modes.materialize) {
  if (artifactRoot === repoRoot) throw new Error('--materialize requires URAI_STAGING_PREBUILT_ROOT outside the repository.');
  const verified = compareControlledSourceToArtifact(identity);
  const destination = path.join(repoRoot, 'functions/lib');
  fs.rmSync(destination, { recursive: true, force: true });
  copyTree(path.join(artifactRoot, 'functions/lib'), destination);
  const localManifest = path.join(repoRoot, manifestRelativePath);
  fs.mkdirSync(path.dirname(localManifest), { recursive: true });
  fs.rmSync(localManifest, { force: true });
  fs.copyFileSync(verified.manifestPath, localManifest, fs.constants.COPYFILE_EXCL);
  const materialized = readVerifiedManifest(repoRoot, identity);
  console.log(JSON.stringify({ status: 'MATERIALIZED', ...identity, ...materialized.summary }, null, 2));
} else {
  const verified = readVerifiedManifest(repoRoot, identity);
  console.log(JSON.stringify({ status: 'PASS', ...identity, ...verified.summary }, null, 2));
}
