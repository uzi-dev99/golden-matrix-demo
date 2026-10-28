/** Input of the whole app: what the birth form produces. */
export interface NatalPlace {
  label: string; // "City, Country" (Nominatim display name, shortened)
  latitude: number; // 6 decimals
  longitude: number; // 6 decimals
  timezone: string; // IANA zone, required, editable in the form
}

export interface BirthInput {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  place: NatalPlace;
}

export const PLANET_KEYS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;
export type PlanetKey = (typeof PLANET_KEYS)[number];

export interface PlanetPosition {
  key: PlanetKey;
  label: string; // Spanish: Sol, Luna, ...
  sign: string; // English sign name (astrochart / debugging)
  signEs: string; // Spanish sign name (UI + prompt)
  degree: number; // 0..30 inside the sign, 2 decimals
  absoluteDegree: number; // 0..360 ecliptic longitude, 2 decimals
  house: number; // 1..12
  retrograde: boolean;
}

export interface HouseCusp {
  house: number; // 1..12
  sign: string;
  signEs: string;
  degree: number;
  absoluteDegree: number;
}

export interface Aspect {
  planet1: string; // Spanish planet label, e.g. "Sol"
  planet2: string;
  aspect: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  aspectEs: string;
  orb: number; // degrees, 2 decimals
}

export interface Angle {
  sign: string;
  signEs: string;
  degree: number;
  absoluteDegree: number;
}

export interface NatalChart {
  input: BirthInput;
  utcInstant: string; // ISO-8601 UTC of the birth moment
  sun: PlanetPosition | null;
  moon: PlanetPosition | null;
  ascendant: Angle;
  midheaven: Angle;
  planets: PlanetPosition[]; // 10, in PLANET_KEYS order
  houses: HouseCusp[]; // 12
  aspects: Aspect[];
  nodes: { northNode: Angle; southNode: Angle };
  warnings: string[]; // e.g. Placidus -> Porphyry fallback
}
