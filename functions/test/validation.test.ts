import { describe, expect, it } from 'vitest';
import {
  assertPlainObject,
  optionalPlainObject,
  optionalString,
  requiredBoolean,
  requiredSlug,
  requiredString,
} from '../src/lib/validation';

describe('validation helpers', () => {
  it('accepts plain objects', () => {
    expect(assertPlainObject({ ok: true })).toEqual({ ok: true });
  });

  it('rejects arrays as plain objects', () => {
    expect(() => assertPlainObject([])).toThrow('must be an object');
  });

  it('defaults optional plain objects to an empty object', () => {
    expect(optionalPlainObject(undefined)).toEqual({});
  });

  it('trims and returns required strings', () => {
    expect(requiredString('  event.created  ', 'type')).toBe('event.created');
  });

  it('rejects blank strings', () => {
    expect(() => requiredString('   ', 'type')).toThrow('type is required');
  });

  it('returns null for optional empty strings', () => {
    expect(optionalString('', 'description')).toBeNull();
  });

  it('requires booleans', () => {
    expect(requiredBoolean(false, 'enabled')).toBe(false);
    expect(() => requiredBoolean('false', 'enabled')).toThrow('enabled must be a boolean');
  });

  it('accepts safe slugs', () => {
    expect(requiredSlug('release_candidate-1.enabled', 'flag')).toBe('release_candidate-1.enabled');
  });

  it('rejects unsafe slugs', () => {
    expect(() => requiredSlug('../bad', 'flag')).toThrow('may only contain');
  });
});
