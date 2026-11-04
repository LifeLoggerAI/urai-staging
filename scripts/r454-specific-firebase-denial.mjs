/**
 * Nonproduction Firebase Auth emulator test helper.
 * A transport outage, SDK setup failure, or generic rejection must NEVER
 * be counted as a successful security-denial assertion.
 * This is test-only code, not a Firebase security check or consent authority.
 */
export async function requireFirebaseAuthDenial(label, action, expectedCodes, messagePattern = null) {
  if (typeof label !== 'string' || !/^[a-z][a-z0-9-]{2,100}$/.test(label) ||
      typeof action !== 'function' || !Array.isArray(expectedCodes) ||
      expectedCodes.length === 0 ||
      expectedCodes.some(code => typeof code !== 'string' || !/^auth\/[a-z-]{3,50}$/.test(code)) ||
      (messagePattern !== null && !(messagePattern instanceof RegExp))) {
    throw new TypeError('r454_invalid_denial_assertion_configuration');
  }
  let error;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  if (error === undefined) throw new Error(`r454_${label}_unexpectedly_authorized`);
  const code = error && typeof error === 'object' ? error.code : undefined;
  if (typeof code !== 'string' || !expectedCodes.includes(code)) {
    // Never serialize the underlying error, because SDK errors can contain
    // request context. The caller sees only an inert test-case label.
    throw new Error(`r454_${label}_wrong_denial_class`);
  }
  if (messagePattern && !messagePattern.test(String(error.message || ''))) {
    throw new Error(`r454_${label}_wrong_denial_reason`);
  }
  return code;
}
