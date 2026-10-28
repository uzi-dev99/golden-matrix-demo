import type { BirthInput } from '@/lib/types';

/** Invented people: the golden fixtures of the natal engine (AC4). */
export const madrid: BirthInput = {
  name: 'Persona de prueba A',
  date: '1990-05-17',
  time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.416775, longitude: -3.70379, timezone: 'Europe/Madrid' },
};

export const buenosAires: BirthInput = {
  name: 'Persona de prueba B',
  date: '1985-11-03',
  time: '06:15',
  place: { label: 'Buenos Aires, Argentina', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
};

export const tromso: BirthInput = {
  name: 'Persona de prueba C',
  date: '2001-12-21',
  time: '23:50',
  place: { label: 'Tromsø, Noruega', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' },
};

/** J2000 reference: the Sun's ecliptic longitude at 2000-01-01T12:00:00Z is ≈ 280.37°. */
export const j2000: BirthInput = {
  name: 'Persona de prueba D',
  date: '2000-01-01',
  time: '12:00',
  place: { label: 'UTC', latitude: 0, longitude: 0, timezone: 'UTC' },
};
