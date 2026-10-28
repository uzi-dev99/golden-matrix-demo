declare module 'tz-lookup' {
  /** Returns the IANA zone id for a point; throws RangeError on invalid coordinates. */
  export default function tzLookup(latitude: number, longitude: number): string;
}
