import { describe, expect, test } from 'vitest';
import { isValidTimeZone, timezoneFor } from './timezone';

describe('timezone', () => {
  test('AC8 — resolves the zone from the point', () => {
    expect(timezoneFor(-34.6037, -58.3816)).toBe('America/Argentina/Buenos_Aires');
    expect(timezoneFor(40.4168, -3.7038)).toBe('Europe/Madrid');
  });
  test('AC8 — bad coordinates give null, validation rejects junk', () => {
    expect(timezoneFor(999, 999)).toBeNull();
    expect(isValidTimeZone('Europe/Madrid')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('  ')).toBe(false);
  });
});
