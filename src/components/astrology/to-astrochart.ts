import type { Aspect, NatalChart } from '@/lib/types';

// @astrodraw/astrochart does not export these types from its public entry point; declared here on purpose.
export interface AstroData {
  planets: Record<string, number[]>;
  cusps: number[];
}
export interface FormedAspect {
  point: { name: string; position: number };
  toPoint: { name: string; position: number };
  aspect: { name: string; degree: number; color: string; orbit: number };
  precision: string;
}

const KEY_TO_LIB: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
};
const LABEL_TO_LIB: Record<string, string> = {
  Sol: 'Sun', Luna: 'Moon', Mercurio: 'Mercury', Venus: 'Venus', Marte: 'Mars',
  Júpiter: 'Jupiter', Saturno: 'Saturn', Urano: 'Uranus', Neptuno: 'Neptune', Plutón: 'Pluto',
};
const ASPECT_DEGREE: Record<Aspect['aspect'], number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

/** Wheel colours come from the design tokens: hard aspects in the one brass hue, soft ones in grey. */
export const ASPECT_COLOR: Record<Aspect['aspect'], string> = {
  conjunction: '#0b0d10',
  opposition: '#8c5d12',
  square: '#8c5d12',
  trine: '#8a929c',
  sextile: '#8a929c',
};

/** Planets and nodes keyed the way the library expects (`NNode` / `SNode` for the lunar nodes). */
export function chartToRadixData(chart: NatalChart): AstroData {
  const planets: Record<string, number[]> = {};
  for (const p of chart.planets) planets[KEY_TO_LIB[p.key]] = [p.absoluteDegree];
  planets.NNode = [chart.nodes.northNode.absoluteDegree];
  planets.SNode = [chart.nodes.southNode.absoluteDegree];
  return { planets, cusps: chart.houses.map((h) => h.absoluteDegree) };
}

/** Aspects with the real position of each planet; the library draws nothing useful without it. */
export function chartToFormedAspects(chart: NatalChart): FormedAspect[] {
  const pos = new Map(chart.planets.map((p) => [p.label, p.absoluteDegree]));
  return chart.aspects.flatMap((a) => {
    const n1 = LABEL_TO_LIB[a.planet1];
    const n2 = LABEL_TO_LIB[a.planet2];
    const p1 = pos.get(a.planet1);
    const p2 = pos.get(a.planet2);
    if (!n1 || !n2 || p1 === undefined || p2 === undefined) return [];
    return [{
      point: { name: n1, position: p1 },
      toPoint: { name: n2, position: p2 },
      aspect: { name: a.aspect, degree: ASPECT_DEGREE[a.aspect], color: ASPECT_COLOR[a.aspect], orbit: a.orb },
      precision: '0',
    }];
  });
}
