import test from 'node:test';
import assert from 'node:assert/strict';
import { requireFirebaseAuthDenial } from './r454-specific-firebase-denial.mjs';

const firebaseError = (code, message = 'Firebase identity denied') => Object.assign(new Error(message), { code });

test('expected user-disabled security rejection accepted', async () => {
  assert.equal(await requireFirebaseAuthDenial('disabled-service', async () => {
    throw firebaseError('auth/user-disabled');
  }, ['auth/user-disabled']), 'auth/user-disabled');
});

test('wrong audience rejection accepted only with auth class and reason', async () => {
  assert.equal(await requireFirebaseAuthDenial('cross-project', () => Promise.reject(
    firebaseError('auth/argument-error', 'Firebase ID token incorrect aud (audience) claim')
  ), ['auth/argument-error', 'auth/invalid-id-token'], /\baud(?:ience)?\b/i), 'auth/argument-error');
});

test('success cannot be mistaken for denial', async () => {
  await assert.rejects(requireFirebaseAuthDenial('accepted-request', async () => true, ['auth/user-disabled']),
    /r454_accepted-request_unexpectedly_authorized/);
});

test('network outage cannot be mistaken for denial', async () => {
  await assert.rejects(requireFirebaseAuthDenial('offline-network', async () => {
    throw new Error('ECONNREFUSED to emulator');
  }, ['auth/user-disabled']), /r454_offline-network_wrong_denial_class/);
});

test('wrong Firebase code cannot be mistaken for security rejection', async () => {
  await assert.rejects(requireFirebaseAuthDenial('wrong-code', async () => {
    throw firebaseError('auth/internal-error');
  }, ['auth/user-disabled']), /r454_wrong-code_wrong_denial_class/);
});

test('same code with wrong audience reason fails', async () => {
  await assert.rejects(requireFirebaseAuthDenial('wrong-reason', async () => {
    throw firebaseError('auth/argument-error', 'Malformed email string');
  }, ['auth/argument-error'], /\baud(?:ience)?\b/i), /r454_wrong-reason_wrong_denial_reason/);
});

test('arbitrary exception primitives never pass', async () => {
  await assert.rejects(requireFirebaseAuthDenial('string-error', async () => { throw 'auth/user-disabled'; },
    ['auth/user-disabled']), /r454_string-error_wrong_denial_class/);
});

test('invalid assertion configuration is rejected', async () => {
  await assert.rejects(requireFirebaseAuthDenial('bad', async () => {}, ['network-error']),
    /r454_invalid_denial_assertion_configuration/);
});

test('unexpected truthy resolved result remains failure', async () => {
  await assert.rejects(requireFirebaseAuthDenial('resolved-object', async () => ({ denied: true }),
    ['auth/user-disabled']), /r454_resolved-object_unexpectedly_authorized/);
});
