import * as functions from 'firebase-functions';

export type JsonObject = Record<string, unknown>;

const MAX_STRING_LENGTH = 500;
const MAX_PAYLOAD_KEYS = 50;

export function assertPlainObject(value: unknown, fieldName = 'payload'): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be an object`);
  }

  return value as JsonObject;
}

export function optionalPlainObject(value: unknown, fieldName = 'payload'): JsonObject {
  if (value === undefined || value === null) {
    return {};
  }

  const objectValue = assertPlainObject(value, fieldName);
  if (Object.keys(objectValue).length > MAX_PAYLOAD_KEYS) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} has too many keys`);
  }

  return objectValue;
}

export function requiredString(value: unknown, fieldName: string, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is required`);
  }

  if (trimmed.length > maxLength) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is too long`);
  }

  return trimmed;
}

export function optionalString(value: unknown, fieldName: string, maxLength = MAX_STRING_LENGTH): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return requiredString(value, fieldName, maxLength);
}

export function requiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a boolean`);
  }

  return value;
}

export function requiredSlug(value: unknown, fieldName: string): string {
  const slug = requiredString(value, fieldName, 120);

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(slug)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `${fieldName} may only contain letters, numbers, dots, underscores, and dashes`
    );
  }

  return slug;
}
