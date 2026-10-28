import * as Astronomy from 'astronomy-engine';

interface RawPlanet {
  key: string;
  label_es: string;
  sign: string;
  sign_es: string;
  degree: number;
  absoluteDegree: number;
  house: number;
  retrograde: boolean;
}

interface RawHouse {
  house: number;
  sign: string;
  sign_es: string;
  degree: number;
  absoluteDegree: number;
}

interface RawAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_es: string;
  orb: number;
}

const ZODIAC_SIGNS = [
  { name: 'Aries', name_es: 'Aries' },
  { name: 'Taurus', name_es: 'Tauro' },
  { name: 'Gemini', name_es: 'Géminis' },
  { name: 'Cancer', name_es: 'Cáncer' },
  { name: 'Leo', name_es: 'Leo' },
  { name: 'Virgo', name_es: 'Virgo' },
  { name: 'Libra', name_es: 'Libra' },
  { name: 'Scorpio', name_es: 'Escorpio' },
  { name: 'Sagittarius', name_es: 'Sagitario' },
  { name: 'Capricorn', name_es: 'Capricornio' },
  { name: 'Aquarius', name_es: 'Acuario' },
  { name: 'Pisces', name_es: 'Piscis' }
];

// Modern planets are included.
const PLANET_METADATA: { [key: string]: { label_es: string; astronomyBody: string } } = {
  sun: { label_es: 'Sol', astronomyBody: 'Sun' },
  moon: { label_es: 'Luna', astronomyBody: 'Moon' },
  mercury: { label_es: 'Mercurio', astronomyBody: 'Mercury' },
  venus: { label_es: 'Venus', astronomyBody: 'Venus' },
  mars: { label_es: 'Marte', astronomyBody: 'Mars' },
  jupiter: { label_es: 'Júpiter', astronomyBody: 'Jupiter' },
  saturn: { label_es: 'Saturno', astronomyBody: 'Saturn' },
  uranus: { label_es: 'Urano', astronomyBody: 'Uranus' },
  neptune: { label_es: 'Neptuno', astronomyBody: 'Neptune' },
  pluto: { label_es: 'Plutón', astronomyBody: 'Pluto' },
};

function normalizeDegrees(deg: number): number {
  let r = deg % 360;
  if (r < 0) r += 360;
  return r;
}

function getZodiacDetails(absoluteDegree: number) {
  const norm = normalizeDegrees(absoluteDegree);
  const signIndex = Math.floor(norm / 30) % 12;
  const sign = ZODIAC_SIGNS[signIndex];
  const degree = norm % 30;
  return {
    sign: sign.name,
    sign_es: sign.name_es,
    degree,
    absoluteDegree: norm
  };
}

// LST (GMT sidereal time + longitude)

function calculateAngles(time: Astronomy.AstroTime, latitude: number, longitude: number) {
  // Obliquity of the ecliptic (~23.439 degrees)
  const obliqDeg = 23.439291;
  const obliqRad = (obliqDeg * Math.PI) / 180;

  // Greenwich mean sidereal time in hours
  const gmstHours = Astronomy.SiderealTime(time);

  // Local sidereal time in hours and radians
  const lstHours = normalizeDegrees((gmstHours + longitude / 15) * 15) / 15;
  const lstRad = (lstHours * 15 * Math.PI) / 180;

  const latRad = (latitude * Math.PI) / 180;

  // Midheaven (MC) formula
  // MC = atan2(sin(LST), cos(LST) * cos(obliquity))
  const mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(obliqRad));
  const mcDeg = normalizeDegrees((mcRad * 180) / Math.PI);

  // Ascendant (ASC) formula
  // ASC = atan2(cos(LST), -sin(LST) * cos(obliquity) - tan(latitude) * sin(obliquity))
  const ascRad = Math.atan2(
    Math.cos(lstRad),
    -Math.sin(lstRad) * Math.cos(obliqRad) - Math.tan(latRad) * Math.sin(obliqRad)
  );
  const ascDeg = normalizeDegrees((ascRad * 180) / Math.PI);

  return {
    ascendant: ascDeg,
    midheaven: mcDeg,
    // RAMC (Right Ascension of MC) = Local Sidereal Time in degrees. Placidus
    // cusps require RAMC, not MC's ecliptic longitude (they differ by ~ε).
    ramcDeg: normalizeDegrees(lstHours * 15),
  };
}

// Placidus house cusps determination — Meeus "Astronomical Algorithms" cap. 13.
// Semiarc trisection: cusps 11/12 sit at 1/3 and 2/3 of the diurnal arc from
// MC to ASC, cusps 2/3 sit at 1/3 and 2/3 of the nocturnal arc from ASC to IC.
// Cusps 1, 10, 7, 4 are closed-form: ASC, MC, MC+180, ASC+180 respectively.
// For |lat| ≥ 66° (polar circle), Placidus does not converge — fall back to Porphyry.

function calculatePlacidusHouses(
  ramcDeg: number,
  obliquityDeg: number,
  latitudeDeg: number
): { cusps: number[]; fallback?: 'porphyry'; warning?: string } {
  const POLAR_LIMIT = 66;

  if (Math.abs(latitudeDeg) >= POLAR_LIMIT) {
    return {
      cusps: calculatePorphyryHouses(ramcDeg, obliquityDeg, latitudeDeg),
      fallback: 'porphyry',
      warning: 'Placidus no converge en latitudes polares (|lat| ≥ 66°); usando Porphyry (división en 3 partes iguales por cuadrante).',
    };
  }

  const epsRad = (obliquityDeg * Math.PI) / 180;
  const ramcRad = (ramcDeg * Math.PI) / 180;
  const latRad = (latitudeDeg * Math.PI) / 180;

  // Closed-form MC, ASC, IC, DSC
  const mcRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad));
  const ascRad = Math.atan2(
    Math.cos(ramcRad),
    -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad)
  );

  const cusp10 = normalizeDegrees((mcRad * 180) / Math.PI);
  const cusp1 = normalizeDegrees((ascRad * 180) / Math.PI);
  const cusp4 = normalizeDegrees(cusp10 + 180);
  const cusp7 = normalizeDegrees(cusp1 + 180);

  // Helper to convert RA (y) to Ecliptic Longitude (lambda)
  const raToEcliptic = (yRad: number): number => {
    const lonRad = Math.atan2(Math.sin(yRad), Math.cos(yRad) * Math.cos(epsRad));
    return normalizeDegrees((lonRad * 180) / Math.PI);
  };

  // Meeus Placidus semiarc trisection iteration for intermediate RAs.
  // The ascensional-difference term is always ADDED: RA2 = RAMC + 120 + 2·AD/3,
  // RA3 = RAMC + 150 + AD/3, RA11 = RAMC + 30 + AD/3, RA12 = RAMC + 60 + 2·AD/3.
  const solveCuspRa = (baseOffsetDeg: number, factor: number): number => {
    let y = ramcRad + (baseOffsetDeg * Math.PI) / 180;
    for (let iter = 0; iter < 15; iter++) {
      const sinDec = Math.sin(epsRad) * Math.sin(y);
      const tanDec = sinDec / Math.sqrt(Math.max(0.00001, 1 - sinDec * sinDec));
      const val = Math.tan(latRad) * tanDec;
      const clampedVal = Math.max(-0.9999, Math.min(0.9999, val));
      const f = factor * Math.asin(clampedVal);
      y = ramcRad + (baseOffsetDeg * Math.PI) / 180 + f;
    }
    return y;
  };

  // Cusps 11, 12 (diurnal semiarc from MC)
  const y11 = solveCuspRa(30, 1 / 3);
  const y12 = solveCuspRa(60, 2 / 3);
  const cusp11 = raToEcliptic(y11);
  const cusp12 = raToEcliptic(y12);

  // Cusps 2, 3 (nocturnal semiarc from IC)
  const y2 = solveCuspRa(120, 2 / 3);
  const y3 = solveCuspRa(150, 1 / 3);
  const cusp2 = raToEcliptic(y2);
  const cusp3 = raToEcliptic(y3);

  // Cusps 5, 6, 8, 9 — opposites (+180°)
  const cusp5 = normalizeDegrees(cusp11 + 180);
  const cusp6 = normalizeDegrees(cusp12 + 180);
  const cusp8 = normalizeDegrees(cusp2 + 180);
  const cusp9 = normalizeDegrees(cusp3 + 180);

  return {
    cusps: [cusp1, cusp2, cusp3, cusp4, cusp5, cusp6, cusp7, cusp8, cusp9, cusp10, cusp11, cusp12],
  };
}

// Porphyry fallback: each quadrant (ASC→IC, IC→DSC, DSC→MC, MC→ASC) is
// divided into 3 equal degree arcs. Only used for polar latitudes where
// Placidus does not converge.
function calculatePorphyryHouses(
  ramcDeg: number,
  obliquityDeg: number,
  latitudeDeg: number
): number[] {
  const epsRad = (obliquityDeg * Math.PI) / 180;
  const ramcRad = (ramcDeg * Math.PI) / 180;
  const latRad = (latitudeDeg * Math.PI) / 180;
  const mcRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad));
  const ascRad = Math.atan2(
    Math.cos(ramcRad),
    -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad)
  );
  const mc = normalizeDegrees((mcRad * 180) / Math.PI);
  const asc = normalizeDegrees((ascRad * 180) / Math.PI);
  const ic = normalizeDegrees(mc + 180);
  const dsc = normalizeDegrees(asc + 180);

  const arc = (start: number, end: number, fraction: number) => {
    let diff = end - start;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return normalizeDegrees(start + diff * fraction);
  };

  const cusp1 = asc;
  const cusp2 = arc(asc, ic, 1 / 3);
  const cusp3 = arc(asc, ic, 2 / 3);
  const cusp4 = ic;
  const cusp5 = arc(ic, dsc, 1 / 3);
  const cusp6 = arc(ic, dsc, 2 / 3);
  const cusp7 = dsc;
  const cusp8 = arc(dsc, mc, 1 / 3);
  const cusp9 = arc(dsc, mc, 2 / 3);
  const cusp10 = mc;
  const cusp11 = arc(mc, asc, 1 / 3);
  const cusp12 = arc(mc, asc, 2 / 3);

  return [cusp1, cusp2, cusp3, cusp4, cusp5, cusp6, cusp7, cusp8, cusp9, cusp10, cusp11, cusp12];
}

// Turns an array of 12 absolute-degree cusps (clockwise from ASC) into house cusps.

function housesFromCusps(cusps: number[]): RawHouse[] {
  return cusps.map((cusp, i) => {
    const details = getZodiacDetails(cusp);
    return {
      house: i + 1,
      sign: details.sign,
      sign_es: details.sign_es,
      degree: details.degree,
      absoluteDegree: details.absoluteDegree,
    };
  });
}

function isDegreeInArc(deg: number, start: number, end: number): boolean {
  const normDeg = normalizeDegrees(deg);
  const normStart = normalizeDegrees(start);
  const normEnd = normalizeDegrees(end);

  if (normStart <= normEnd) {
    return normDeg >= normStart && normDeg < normEnd;
  } else {
    return normDeg >= normStart || normDeg < normEnd;
  }
}

// Find the Placidus house index (1..12) for an arbitrary ecliptic longitude.
// House i (1..12) spans the ecliptic arc from cusp[i-1] to cusp[i % 12].
function getPlacidusHouseIndex(planetLong: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    if (isDegreeInArc(planetLong, start, end)) {
      return i + 1;
    }
  }
  return 1;
}

// Aspect analysis
function calculateAspects(planets: RawPlanet[]): RawAspect[] {
  const aspects: RawAspect[] = [];
  const ASPECT_TYPES = [
    { name: 'conjunction', name_es: 'conjunción', target: 0, orb: 8 },
    { name: 'opposition', name_es: 'oposición', target: 180, orb: 8 },
    { name: 'trine', name_es: 'trígono', target: 120, orb: 8 },
    { name: 'square', name_es: 'cuadratura', target: 90, orb: 8 },
    { name: 'sextile', name_es: 'sextil', target: 60, orb: 6 }
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      let diff = Math.abs(p1.absoluteDegree - p2.absoluteDegree) % 360;
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_TYPES) {
        if (Math.abs(diff - asp.target) <= asp.orb) {
          aspects.push({
            planet1: p1.label_es,
            planet2: p2.label_es,
            aspect: asp.name,
            aspect_es: asp.name_es,
            orb: parseFloat(Math.abs(diff - asp.target).toFixed(2))
          });
          break; // Avoid double aspects for same pair
        }
      }
    }
  }
  return aspects;
}

export function calculateChartForMoment(
  date: Date,
  latitude: number,
  longitude: number
) {
  const time = Astronomy.MakeTime(date);

  // 1. Calculate Angles
  const angles = calculateAngles(time, latitude, longitude);
  const ascDetails = getZodiacDetails(angles.ascendant);
  const mcDetails = getZodiacDetails(angles.midheaven);

  // 2. Placidus House Cusps (Meeus cap. 13). Falls back to Porphyry at
  // |lat| ≥ 66°. The obliquity used here matches calculateAngles().
  const placidusResult = calculatePlacidusHouses(angles.ramcDeg, 23.439291, latitude);
  const houses = housesFromCusps(placidusResult.cusps);
  const houseWarnings: string[] = placidusResult.warning ? [placidusResult.warning] : [];

  // 3. Planet positions and retrograde status
  // We approximate retrograde by taking position 0.1 days earlier
  const prevTime = Astronomy.MakeTime(new Date(date.getTime() - 0.1 * 24 * 60 * 60 * 1000));

  const planets: RawPlanet[] = [];
  for (const [key, meta] of Object.entries(PLANET_METADATA)) {
    // Current Position
    const vec = Astronomy.GeoVector(meta.astronomyBody as Astronomy.Body, time, true);
    const ecl = Astronomy.Ecliptic(vec);

    // Previous Position
    const prevVec = Astronomy.GeoVector(meta.astronomyBody as Astronomy.Body, prevTime, true);
    const prevEcl = Astronomy.Ecliptic(prevVec);

    // Longitude difference with wrap around
    let diff = ecl.elon - prevEcl.elon;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    const isRetrograde = diff < 0;

    const zodiac = getZodiacDetails(ecl.elon);
    const house = getPlacidusHouseIndex(ecl.elon, placidusResult.cusps);

    planets.push({
      key,
      label_es: meta.label_es,
      sign: zodiac.sign,
      sign_es: zodiac.sign_es,
      degree: parseFloat(zodiac.degree.toFixed(2)),
      absoluteDegree: parseFloat(ecl.elon.toFixed(2)),
      house,
      retrograde: isRetrograde
    });
  }

  // 4. Mean lunar node analysis (Mean North Node longitude approximation)
  // Formula: Ω = 125.0445550 - 1934.1361849 * T + 0.0020756 * T^2
  // where T is Julian Centuries from J2000.0
  const T = time.ut / 36525.0;
  const northNodeAbs = normalizeDegrees(125.0445550 - 1934.1361849 * T + 0.0020756 * T * T);
  const southNodeAbs = normalizeDegrees(northNodeAbs + 180);

  const northNodeZodiac = getZodiacDetails(northNodeAbs);
  const southNodeZodiac = getZodiacDetails(southNodeAbs);

  const aspects = calculateAspects(planets);

  const sun = planets.find(p => p.key === 'sun') || null;
  const moon = planets.find(p => p.key === 'moon') || null;

  return {
    sun,
    moon,
    ascendant: ascDetails,
    midheaven: mcDetails,
    planets,
    houses,
    aspects,
    nodes: {
      northNode: northNodeZodiac,
      southNode: southNodeZodiac
    },
    warnings: houseWarnings,
  };
}

