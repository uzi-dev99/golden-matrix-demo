/** 6.9991 -> "7°00′". Rounds to whole minutes first so minutes never read 60. */
export function formatDegree(degree: number): string {
  const total = Math.round(degree * 60);
  // 29.9999° is 0°00′ of the next sign: the degree never leaves the 0..30 range of a sign.
  const within = total % (30 * 60);
  return `${Math.floor(within / 60)}°${String(within % 60).padStart(2, '0')}′`;
}

/** The 12 signs in order, as the natal port names them (the port itself is server-side). */
export const SIGNS_ES: readonly string[] = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
];

/** A degree that reaches 30°00′ belongs to the next sign: the sign and the degree to show. */
export function signAndDegree(signEs: string, degree: number): { sign: string; degree: number } {
  if (Math.round(degree * 60) < 30 * 60) return { sign: signEs, degree };
  const i = SIGNS_ES.indexOf(signEs);
  return { sign: i >= 0 ? SIGNS_ES[(i + 1) % SIGNS_ES.length] : signEs, degree: 0 };
}

/** "1990-05-17" -> "17 may 1990" (Spanish, no timezone shifts: parses the parts, not a Date). */
export function formatDate(iso: string): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
