// Disposable Firebase-emulator synthetic storage cleanup helper. No live-media use.
// The caller must enforce authenticated owner UID and revoke consent before use.
export type SyntheticStorageObject = {
  name: string
  delete(options: { ignoreNotFound: true }): Promise<unknown>
}
export type SyntheticStorageList = (prefix: string) => Promise<readonly SyntheticStorageObject[]>
export type SyntheticStorageDeny = (code: string) => never

// A Firebase Auth UID is authentication evidence, not proof that it is a
// safe Firestore document segment or an owner-scoped Storage prefix.  Reject
// separators, control characters and reserved dot names before any I/O.
export function assertSyntheticOwnerUid(uid: string, deny: SyntheticStorageDeny): string {
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128 ||
      uid === '.' || uid === '..' || !uid.trim() || /[\/\\\u0000-\u001f\u007f]/.test(uid)) {
    return deny('SYNTHETIC_OWNER_UID_INVALID')
  }
  return uid
}

export async function sweepSyntheticStorageResidue(
  uid: string,
  list: SyntheticStorageList,
  deny: SyntheticStorageDeny,
): Promise<number> {
  const safeUid = assertSyntheticOwnerUid(uid, deny)
  const prefix = 'staging_synthetic_memories/' + safeUid + '/'
  const files = await list(prefix)
  if (!Array.isArray(files)) return deny('SYNTHETIC_STORAGE_LIST_UNAVAILABLE')

  // Validate the entire owner-scoped listing before deleting anything.
  // A malformed path must not trick the cleanup into deleting a sibling's media.
  const seen = new Set<string>()
  for (const file of files) {
    const suffix = typeof file?.name === 'string' && file.name.startsWith(prefix)
      ? file.name.slice(prefix.length) : ''
    if (!/^[A-Za-z0-9_-]{6,128}\.bin$/.test(suffix) || seen.has(file.name)) {
      return deny('SYNTHETIC_CLEANUP_SOURCE_MISMATCH')
    }
    seen.add(file.name)
  }

  for (const file of files) await file.delete({ ignoreNotFound: true })

  // A failed list, failed deletion or a single remaining byte must deny
  // cleanupComplete to the calling consent-revocation workflow.
  const remaining = await list(prefix)
  if (!Array.isArray(remaining)) return deny('SYNTHETIC_STORAGE_LIST_UNAVAILABLE')
  if (remaining.length !== 0) return deny('SYNTHETIC_STORAGE_CLEANUP_INCOMPLETE')
  return files.length
}
