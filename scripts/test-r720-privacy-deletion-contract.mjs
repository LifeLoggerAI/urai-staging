import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const PRIVACY_SHA = 'dd1697cc04833428d746a3f671a908f2825ee4b6';
const ORIGINAL_BLOB = '1a9ffd566bd6be8257b598a216cf254228971447';
const SOURCE = new URL('./fixtures/r720-privacy/deletion-contract.ts', import.meta.url);
const source = readFileSync(SOURCE);
const blob = createHash('sha1').update('blob ' + source.length + '\0').update(source).digest('hex');
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const ts = require('typescript');
assert.equal(blob, ORIGINAL_BLOB, 'Exact original Privacy source Git blob drifted');
const output = ts.transpileModule(source.toString('utf8'), {
  fileName: 'deletion-contract.ts',
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
});
assert.equal((output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const temp = mkdtempSync(join(tmpdir(), 'urai-r720-privacy-'));
let policy;
try {
  const filename = join(temp, 'deletion-contract.mjs');
  writeFileSync(filename, output.outputText);
  policy = await import(pathToFileURL(filename).href);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
const makeManifest = adapters => ({
  version: policy.DELETION_MANIFEST_VERSION,
  subjectHash: 'a'.repeat(64),
  requestId: 'synthetic-review-only',
  legalHold: false,
  adapters
});
const registered = () => policy.DELETION_ADAPTERS.map(a => ({
  adapterId: a.id,
  system: a.system,
  status: a.status,
  itemCount: a.status === 'active' ? 0 : null
}));

test('R720 exact Privacy #221 original deletion-contract source remains pinned', () => {
  assert.equal(blob, ORIGINAL_BLOB);
  assert.match(PRIVACY_SHA, /^[0-9a-f]{40}$/);
  assert.equal(policy.DELETION_MANIFEST_VERSION, '1.9.0');
});

test('R720 RuAi and all eight downstream systems remain registered as pending', () => {
  const pending = policy.DELETION_ADAPTERS.filter(a => a.status === 'pending');
  assert.equal(pending.length, 8);
  assert.ok(pending.some(a => a.id === 'ruai-b2bportal'));
  assert.ok(pending.some(a => a.id === 'urai-jobs'));
  assert.equal(policy.deletionEcosystemCompletionBlockReason(), 'PENDING_DOWNSTREAM_DELETION_CONTRIBUTORS');
});

test('R720 registered synthetic manifest must block final cross-system deletion', () => {
  const blockers = policy.deletionExecutionBlockers(makeManifest(registered()));
  assert.ok(blockers.includes('PENDING_ADAPTERS'));
  assert.equal(policy.canExecuteDeletion(makeManifest(registered())), false);
});

test('R720 removing or duplicating RuAi contributor cannot authorize deletion', () => {
  const manifest = registered();
  const omitted = makeManifest(manifest.filter(a => a.adapterId !== 'ruai-b2bportal'));
  assert.ok(policy.deletionExecutionBlockers(omitted).includes('ADAPTER_REGISTRY_MISMATCH'));
  assert.equal(policy.canExecuteDeletion(omitted), false);
  const duplicated = makeManifest([...manifest, manifest.find(a => a.adapterId === 'ruai-b2bportal')]);
  assert.ok(policy.deletionExecutionBlockers(duplicated).includes('ADAPTER_REGISTRY_MISMATCH'));
  assert.equal(policy.canExecuteDeletion(duplicated), false);
});

test('R720 forged all-active statuses and zero-residual claim cannot authorize deletion', () => {
  const forged = makeManifest(registered().map(a => ({ ...a, status: 'active', itemCount: 0 })));
  assert.ok(policy.deletionExecutionBlockers(forged).includes('ADAPTER_REGISTRY_MISMATCH'));
  assert.equal(policy.canExecuteDeletion(forged), false);
  assert.notEqual(policy.deletionEcosystemCompletionBlockReason(), '');
});

test('R720 legal hold remains a separate hard-stop', () => {
  const manifest = { ...makeManifest(registered()), legalHold: true };
  assert.ok(policy.deletionExecutionBlockers(manifest).includes('ACTIVE_LEGAL_HOLD'));
  assert.equal(policy.canExecuteDeletion(manifest), false);
});
