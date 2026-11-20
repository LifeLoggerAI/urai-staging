import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Source-bound, offline test: never contacts GCP, uses no credentials, and cannot change billing.
const workflow = readFileSync(new URL('../.github/workflows/staging-gcp-authority-readback.yml', import.meta.url), 'utf8');
const lines = workflow.split('\n');
const first = lines.findIndex((line) => line.trim() === '# Read only: do not link, unlink, or mutate billing from this workflow.');
const last = lines.findIndex((line, index) => index > first && line.includes('if gcloud iam service-accounts describe'));
assert.ok(first !== -1 && last > first, 'billing readback shell section not found in exact workflow source');
const readback = lines.slice(first, last).map((line) => line.replace(/^ {10}/, '')).join('\n');
assert.ok(readback.includes('gcloud billing projects describe "$PROJECT_ID" --format=json'), 'provider lookup changed');
assert.ok(!/gcloud billing projects (link|unlink|update)|gcloud billing accounts close/.test(readback), 'billing mutation detected');
assert.ok(!readback.includes("console.log('STAGING_BILLING_ACCOUNT_ID=' + match[1])"), 'unredacted public log');

const prelude = [
  'set -euo pipefail',
  'PROJECT_ID=urai-staging',
  'MOCK_JSON="$1"',
  'MOCK_MODE="$2"',
  'gcloud() {',
  '  if [ "$*" != "billing projects describe urai-staging --format=json" ]; then echo "Unexpected gcloud command" >&2; return 90; fi',
  '  case "$MOCK_MODE" in',
  '    denied) echo "mock permission denied" >&2; return 1 ;;',
  '    invalid) printf "invalid-json"; return 0 ;;',
  '    empty) return 0 ;;',
  '  esac',
  '  printf "%s\\n" "$MOCK_JSON"',
  '}',
].join('\n');

const canonical = '01FC46-A267B5-AEA9BC';
const terminated = '01577D-072472-C614FF';
const other = '01GX9Z-A267B5-QXZ9Y8';
const record = (id) => ({ projectId: 'urai-staging', billingEnabled: true, billingAccountName: 'billingAccounts/' + id });
const cases = [
  ['canonical', record(canonical), 'valid', 0, 'MATCHES_HISTORIC_CANONICAL_REFERENCE', canonical],
  ['terminated', record(terminated), 'valid', 29, 'known terminated account association', terminated],
  ['another account', record(other), 'valid', 0, 'OTHER_ACCOUNT_UNVERIFIED', other],
  ['lowercase ID', record('01gx9z-A267B5-QXZ9Y8'), 'valid', 0, 'OTHER_ACCOUNT_UNVERIFIED', '01gx9z-A267B5-QXZ9Y8'],
  ['denied', record(other), 'denied', 24, 'READBACK=FAILED'],
  ['invalid JSON', record(other), 'invalid', 25, 'invalid provider JSON'],
  ['empty JSON', record(other), 'empty', 25, 'invalid provider JSON'],
  ['wrong project', { ...record(other), projectId: 'wrong-project' }, 'valid', 26, 'project identity mismatch'],
  ['missing project', { billingEnabled: true, billingAccountName: 'billingAccounts/' + other }, 'valid', 26, 'project identity mismatch'],
  ['null project', { ...record(other), projectId: null }, 'valid', 26, 'project identity mismatch'],
  ['disabled billing', { ...record(other), billingEnabled: false }, 'valid', 27, 'billing disabled or unknown'],
  ['missing billing status', { projectId: 'urai-staging', billingAccountName: 'billingAccounts/' + other }, 'valid', 27, 'billing disabled or unknown'],
  ['string billing status', { ...record(other), billingEnabled: 'true' }, 'valid', 27, 'billing disabled or unknown'],
  ['missing account', { projectId: 'urai-staging', billingEnabled: true }, 'valid', 28, 'billing account ID missing or malformed'],
  ['malformed account', { ...record(other), billingAccountName: 'billingAccounts/bad' }, 'valid', 28, 'billing account ID missing or malformed'],
  ['wrong prefix', { ...record(other), billingAccountName: 'projects/' + other }, 'valid', 28, 'billing account ID missing or malformed'],
  ['trailing path', { ...record(other), billingAccountName: 'billingAccounts/' + other + '/extra' }, 'valid', 28, 'billing account ID missing or malformed'],
];
let passed = 0;
for (const [name, input, mode, expectedCode, expectedOutput, account] of cases) {
  const child = spawnSync('bash', ['-c', prelude + '\n' + readback, 'mock', JSON.stringify(input), mode], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(child.error, undefined, name + ': process failed to start');
  const combined = (child.stdout || '') + (child.stderr || '');
  assert.equal(child.status, expectedCode, name + ': exit status mismatch: ' + combined.slice(0, 300));
  assert.ok(combined.includes(expectedOutput), name + ': expected marker missing: ' + combined.slice(0, 300));
  if (expectedCode === 0) {
    assert.ok(combined.includes('STAGING_BILLING_ACCOUNT_ID=WITHHELD_PUBLIC_LOG'), name + ': public ID not redacted');
    assert.ok(combined.includes('STAGING_BILLING_ACCOUNT_SHA256=' + createHash('sha256').update(account).digest('hex')), name + ': wrong fingerprint');
    assert.ok(combined.includes('VERIFIED_PROJECT_ASSOCIATION_ONLY'), name + ': scope missing');
    assert.ok(!combined.includes('STAGING_BILLING_ACCOUNT_ID=' + account), name + ': unredacted ID output');
  } else {
    assert.ok(!combined.includes('VERIFIED_PROJECT_ASSOCIATION_ONLY'), name + ': false positive approval');
  }
  passed += 1;
  console.log('PASS ' + name);
}
console.log('EXACT_WORKFLOW_BILLING_READBACK_' + passed + '/' + cases.length + '_PASS');
