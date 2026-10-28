import { DateTime } from 'luxon';
import type { Angle, Aspect, BirthInput, HouseCusp, NatalChart, PlanetKey, PlanetPosition } from '@/lib/types';
import { calculateChartForMoment } from './engine';

type RawAngle = { sign: string; sign_es: string; degree: number; absoluteDegree: number };

const angle = (a: RawAngle): Angle => ({
  sign: a.sign,
  signEs: a.sign_es,
  degree: a.degree,
  absoluteDegree: a.absoluteDegree,
});

/** Birth moment as a UTC Date. Throws on a missing zone or an impossible local time (DST gap). */
export function birthInstant(input: BirthInput): Date {
  const { date, time, place } = input;
  if (!place.timezone?.trim()) throw new Error('timezone is required (IANA zone, e.g. "Europe/Madrid")');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const dt = DateTime.fromObject({ year, month, day, hour, minute, second: 0 }, { zone: place.timezone });
  if (!dt.isValid) throw new Error(`Invalid birth moment: ${dt.invalidReason ?? 'unknown'}`);
  return dt.toJSDate();
}

/** Pure and deterministic: the chart depends only on the birth instant and place. */
export function calculateNatalChart(input: BirthInput): NatalChart {
  const instant = birthInstant(input);
  const raw = calculateChartForMoment(instant, input.place.latitude, input.place.longitude);

  const planets: PlanetPosition[] = raw.planets.map((p) => ({
    key: p.key as PlanetKey,
    label: p.label_es,
    sign: p.sign,
    signEs: p.sign_es,
    degree: p.degree,
    absoluteDegree: p.absoluteDegree,
    house: p.house,
    retrograde: p.retrograde,
  }));

  const houses: HouseCusp[] = raw.houses.map((h) => ({
    house: h.house,
    sign: h.sign,
    signEs: h.sign_es,
    degree: h.degree,
    absoluteDegree: h.absoluteDegree,
  }));
  const aspects: Aspect[] = raw.aspects.map((a) => ({
    planet1: a.planet1,
    planet2: a.planet2,
    aspect: a.aspect as Aspect['aspect'],
    aspectEs: a.aspect_es,
    orb: a.orb,
  }));

  return {
    input,
    utcInstant: instant.toISOString(),
    sun: planets.find((p) => p.key === 'sun') ?? null,
    moon: planets.find((p) => p.key === 'moon') ?? null,
    ascendant: angle(raw.ascendant),
    midheaven: angle(raw.midheaven),
    planets,
    houses,
    aspects,
    nodes: { northNode: angle(raw.nodes.northNode), southNode: angle(raw.nodes.southNode) },
    warnings: raw.warnings,
  };
}
