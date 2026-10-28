import tzLookup from 'tz-lookup';

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone.trim() });
    return zone.trim().length > 0;
  } catch {
    return false;
  }
}

/** IANA zone for a point; null when the library has no answer (open sea, bad coordinates). */
export function timezoneFor(latitude: number, longitude: number): string | null {
  try {
    const zone = tzLookup(latitude, longitude);
    return isValidTimeZone(zone) ? zone : null;
  } catch {
    return null;
  }
}
