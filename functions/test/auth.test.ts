import { describe, expect, it } from 'vitest';
import * as functions from 'firebase-functions';
import { requireAdmin, requireAuth } from '../src/lib/auth';

function callableContext(auth?: functions.https.CallableContext['auth']): functions.https.CallableContext {
  return { auth } as functions.https.CallableContext;
}

describe('auth helpers', () => {
  it('rejects unauthenticated callable contexts', () => {
    expect(() => requireAuth(callableContext())).toThrow('Auth required');
  });

  it('returns the auth payload for authenticated callers', () => {
    const auth = { uid: 'user-1', token: {} } as functions.https.CallableContext['auth'];
    expect(requireAuth(callableContext(auth))).toBe(auth);
  });

  it('rejects non-admin callers', () => {
    const auth = { uid: 'user-1', token: { role: 'user' } } as functions.https.CallableContext['auth'];
    expect(() => requireAdmin(callableContext(auth))).toThrow('Admin only');
  });

  it('returns the auth payload for admin callers', () => {
    const auth = { uid: 'admin-1', token: { role: 'admin' } } as functions.https.CallableContext['auth'];
    expect(requireAdmin(callableContext(auth))).toBe(auth);
  });
});
