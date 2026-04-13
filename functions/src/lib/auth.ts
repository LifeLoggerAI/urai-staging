import * as functions from 'firebase-functions';

export function requireAuth(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Auth required');
  }
  return context.auth;
}

export function requireAdmin(context: functions.https.CallableContext) {
  const auth = requireAuth(context);
  if (auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  return auth;
}
