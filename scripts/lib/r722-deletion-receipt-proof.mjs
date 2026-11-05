import { createPublicKey, verify as verifySignature } from 'node:crypto';

// Review-only contract. Never use this result as a production deletion authority.
export const R722_SCHEMA = 'urai-subject-deletion-disposition-v1';
export const R722_PENDING = Object.freeze([
  'urai-spatial', 'urai-studio', 'urai-analytics', 'urai-content',
  'urai-jobs', 'asset-factory', 'urai-communications', 'ruai-b2bportal'
]);
const DOMAIN = Buffer.from('ONE-URAI:R722:SYNTHETIC-DELETION-ACK\0', 'utf8');
const HEX64 = /^[a-f0-9]{64}$/;
const TOKEN = /^[a-zA-Z0-9_-]{12,120}$/;
const FIELD_NAMES = Object.freeze([
  'adapterId', 'requestId', 'subjectHash', 'generation', 'tenantScopeHash',
  'disposition', 'residualCount', 'revocationEnforced', 'postRevokeDenied',
  'linkageScanComplete', 'providerAckId', 'tenantAccessWithdrawn',
  'centralAnalyticsRetracted', 'issuedAt', 'expiresAt', 'receiptId'
]);

export function r722CanonicalBytes(p) {
  return Buffer.concat([DOMAIN, Buffer.from(JSON.stringify([
    R722_SCHEMA, ...FIELD_NAMES.map(name => p?.[name])
  ]), 'utf8')]);
}

function validPayload(p, context, now) {
  if (!p || typeof p !== 'object' || Array.isArray(p) ||
      Object.keys(p).length !== FIELD_NAMES.length ||
      FIELD_NAMES.some(name => !Object.hasOwn(p, name))) return 'RECEIPT_SHAPE_INVALID';
  if (!R722_PENDING.includes(p.adapterId)) return 'UNKNOWN_CONTRIBUTOR';
  if (p.requestId !== context.requestId || p.subjectHash !== context.subjectHash ||
      p.generation !== context.generation || p.tenantScopeHash !== context.tenantScopeHash)
    return 'SUBJECT_OR_REQUEST_BINDING_MISMATCH';
  if (!TOKEN.test(p.receiptId)) return 'RECEIPT_ID_INVALID';
  if (!Number.isSafeInteger(p.issuedAt) || !Number.isSafeInteger(p.expiresAt) ||
      p.issuedAt > now + 60_000 || p.issuedAt < now - 86_400_000 ||
      p.expiresAt <= now || p.expiresAt <= p.issuedAt ||
      p.expiresAt > p.issuedAt + 86_400_000) return 'RECEIPT_TIME_INVALID';
  if (!Number.isSafeInteger(p.residualCount) || p.residualCount !== 0 ||
      p.linkageScanComplete !== true ||
      typeof p.revocationEnforced !== 'boolean' ||
      typeof p.postRevokeDenied !== 'boolean' ||
      typeof p.tenantAccessWithdrawn !== 'boolean' ||
      typeof p.centralAnalyticsRetracted !== 'boolean' ||
      typeof p.providerAckId !== 'string') return 'UNVERIFIED_DISPOSITION';
  if (p.disposition === 'deleted') {
    if (!p.revocationEnforced || !p.postRevokeDenied ||
        !TOKEN.test(p.providerAckId)) return 'MISSING_POST_REVOKE_OR_PROVIDER_ACK';
    if (p.adapterId === 'ruai-b2bportal' &&
        (!p.tenantAccessWithdrawn || !p.centralAnalyticsRetracted))
      return 'RUAI_TENANT_OR_ANALYTICS_INCOMPLETE';
  } else if (p.disposition === 'no-data') {
    if (p.providerAckId !== '' || p.revocationEnforced || p.postRevokeDenied ||
        p.tenantAccessWithdrawn || p.centralAnalyticsRetracted)
      return 'NO_DATA_ATTESTATION_INCONSISTENT';
  } else return 'DISPOSITION_INVALID';
  return null;
}

export function verifyR722SyntheticDeletionReceipts({
  context, receipts, trustedPublicKeys, now = Date.now()
} = {}) {
  const failures = [];
  const denied = () => Object.freeze({
    syntheticEvidenceValid: false, productionAuthorized: false,
    globalDeletionVerified: false, releaseHold: true, blockers: [...new Set(failures)]
  });
  if (!context || typeof context !== 'object' || Array.isArray(context) ||
      context.manifestVersion !== '1.9.0' || !TOKEN.test(context.requestId ?? '') ||
      !HEX64.test(context.subjectHash ?? '') ||
      !HEX64.test(context.tenantScopeHash ?? '') ||
      !Number.isSafeInteger(context.generation) || context.generation <= 0 ||
      context.legalHold !== false || context.environment !== 'offline-synthetic-only' ||
      context.productionAuthorized !== false || !Number.isSafeInteger(now)) {
    failures.push('CONTEXT_OR_AUTHORITY_INVALID');
    return denied();
  }
  if (!Array.isArray(receipts) || receipts.length !== R722_PENDING.length) {
    failures.push('INCOMPLETE_CONTRIBUTOR_SET');
    return denied();
  }
  if (!trustedPublicKeys || typeof trustedPublicKeys !== 'object' ||
      Array.isArray(trustedPublicKeys) ||
      Object.keys(trustedPublicKeys).length !== R722_PENDING.length ||
      R722_PENDING.some(id => !Object.hasOwn(trustedPublicKeys, id))) {
    failures.push('TRUST_REGISTRY_INCOMPLETE');
    return denied();
  }
  const seenAdapters = new Set();
  const seenReceipts = new Set();
  const seenKeys = new Set();
  for (const adapterId of R722_PENDING) {
    const record = trustedPublicKeys[adapterId];
    try {
      if (!record || !TOKEN.test(record.keyId ?? '') ||
          typeof record.publicKey !== 'string') throw new Error('invalid identity');
      const key = createPublicKey(record.publicKey);
      if (key.asymmetricKeyType !== 'ed25519') throw new Error('invalid key type');
      const fingerprint = key.export({type:'spki',format:'der'}).toString('hex');
      if (seenKeys.has(fingerprint)) throw new Error('shared signer');
      seenKeys.add(fingerprint);
    } catch {
      failures.push('TRUSTED_KEY_INVALID_OR_SHARED');
    }
  }
  if (failures.length) return denied();
  for (const signed of receipts) {
    const p = signed?.payload;
    const adapterId = p?.adapterId;
    if (seenAdapters.has(adapterId)) failures.push('DUPLICATE_CONTRIBUTOR');
    seenAdapters.add(adapterId);
    if (typeof p?.receiptId === 'string') {
      if (seenReceipts.has(p.receiptId)) failures.push('REPLAYED_RECEIPT_ID');
      seenReceipts.add(p.receiptId);
    }
    const problem = validPayload(p, context, now);
    if (problem) { failures.push(problem); continue; }
    try {
      const registered = trustedPublicKeys[adapterId];
      if (signed.keyId !== registered.keyId ||
          typeof signed.signature !== 'string' ||
          !/^[A-Za-z0-9_-]+$/.test(signed.signature)) {
        failures.push('SIGNER_ID_OR_SIGNATURE_INVALID');
        continue;
      }
      const signature = Buffer.from(signed.signature, 'base64url');
      if (signature.length !== 64 || signature.toString('base64url') !== signed.signature ||
          !verifySignature(null, r722CanonicalBytes(p),
            createPublicKey(registered.publicKey), signature)) {
        failures.push('SIGNATURE_NOT_VERIFIED');
      }
    } catch {
      failures.push('SIGNATURE_NOT_VERIFIED');
    }
  }
  if (seenAdapters.size !== R722_PENDING.length ||
      R722_PENDING.some(id => !seenAdapters.has(id))) failures.push('INCOMPLETE_CONTRIBUTOR_SET');
  if (failures.length) return denied();
  return Object.freeze({
    syntheticEvidenceValid: true,
    productionAuthorized: false,
    globalDeletionVerified: false,
    releaseHold: true,
    blockers: ['DEPLOYED_SERVICE_IDENTITY_IAM_AND_PROVIDER_ACK_PROOF_REQUIRED']
  });
}
