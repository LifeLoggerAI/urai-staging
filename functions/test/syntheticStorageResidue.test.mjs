import assert from 'node:assert/strict'
import test from 'node:test'
import { sweepSyntheticStorageResidue } from '../src/syntheticStorageResidue.ts'

const uid = 'owner-synthetic-1'
const prefix = `staging_synthetic_memories/${uid}/`
const denied = code => { throw new Error(code) }
function fixture(names, { persist = false, failDelete = false, failList = 0, secondMalformed = false } = {}) {
  let reads = 0, deletes = 0
  const objects = new Map(names.map(n => [n, { name: n, delete: async options => {
    assert.deepEqual(options, { ignoreNotFound: true })
    deletes++
    if (failDelete) throw new Error('STORAGE_DELETE_FAILED')
    if (!persist) objects.delete(n)
  } }]))
  const list = async queriedPrefix => {
    reads++
    assert.equal(queriedPrefix, prefix, 'only caller owner prefix may be scanned')
    if (reads === failList) throw new Error('STORAGE_LIST_FAILED')
    if (reads === 2 && secondMalformed) return null
    return [...objects.values()]
  }
  return { list, reads: () => reads, deletes: () => deletes, objects }
}

test('empty owner prefix is verified with two listing passes', async () => {
  const mock = fixture([])
  assert.equal(await sweepSyntheticStorageResidue(uid, mock.list, denied), 0)
  assert.equal(mock.reads(), 2)
})
test('one orphan gets deleted, then zero files confirmed', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'])
  assert.equal(await sweepSyntheticStorageResidue(uid, mock.list, denied), 1)
  assert.equal(mock.objects.size, 0)
  assert.equal(mock.deletes(), 1)
})
test('hundreds of canonical synthetic orphans get deleted', async () => {
  const names = Array.from({length: 251}, (_,n) => prefix + 'orphanMEM_' + String(n).padStart(4,'0') + '.bin')
  const mock = fixture(names)
  assert.equal(await sweepSyntheticStorageResidue(uid, mock.list, denied), 251)
  assert.equal(mock.objects.size, 0)
})
test('foreign-owner object in list fails before any deletion', async () => {
  const mock = fixture([prefix + 'validMEM_1234.bin', 'staging_synthetic_memories/owner-evil/evilMEM_1234.bin'])
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /SYNTHETIC_CLEANUP_SOURCE_MISMATCH/)
  assert.equal(mock.deletes(), 0)
})
test('noncanonical nested path fails before any deletion', async () => {
  const mock = fixture([prefix + 'validMEM_1234.bin', prefix + 'nested/evilMEM_1234.bin'])
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /SYNTHETIC_CLEANUP_SOURCE_MISMATCH/)
  assert.equal(mock.deletes(), 0)
})
test('unexpected extension fails closed without deleting valid objects', async () => {
  const mock = fixture([prefix + 'validMEM_1234.bin', prefix + 'invalidMEM_1234.jpg'])
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /SYNTHETIC_CLEANUP_SOURCE_MISMATCH/)
  assert.equal(mock.deletes(), 0)
})
test('duplicate object names fail before deleting any file', async () => {
  let deletes = 0
  const f = { name:prefix + 'orphanMEM_1234.bin', delete: async () => {deletes++} }
  await assert.rejects(sweepSyntheticStorageResidue(uid, async () => [f, f], denied), /SYNTHETIC_CLEANUP_SOURCE_MISMATCH/)
  assert.equal(deletes, 0)
})
test('first-list failure propagates and does not delete', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'], {failList: 1})
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /STORAGE_LIST_FAILED/)
  assert.equal(mock.deletes(), 0)
})
test('delete failure propagates without claiming cleanup complete', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'], {failDelete: true})
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /STORAGE_DELETE_FAILED/)
  assert.equal(mock.reads(), 1)
})
test('persisting objects after deletion deny cleanupComplete', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'], {persist: true})
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /SYNTHETIC_STORAGE_CLEANUP_INCOMPLETE/)
  assert.equal(mock.reads(), 2)
})
test('second-list error denies successful result', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'], {failList: 2})
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /STORAGE_LIST_FAILED/)
})
test('missing second listing array denies successful result', async () => {
  const mock = fixture([prefix + 'orphanMEM_1234.bin'], {secondMalformed: true})
  await assert.rejects(sweepSyntheticStorageResidue(uid, mock.list, denied), /SYNTHETIC_STORAGE_LIST_UNAVAILABLE/)
})
test('missing first listing array denies successful result', async () => {
  await assert.rejects(sweepSyntheticStorageResidue(uid, async () => null, denied), /SYNTHETIC_STORAGE_LIST_UNAVAILABLE/)
})
