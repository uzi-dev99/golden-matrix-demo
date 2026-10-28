import { calculateNatalChart } from '@/lib/natal/calculate';
import type { NatalPlace } from '@/lib/types';

/** An invented person ("Elena Prueba"), computed by the real engine. */
export const madridPlace: NatalPlace = {
  label: 'Madrid, España',
  latitude: 40.416775,
  longitude: -3.70379,
  timezone: 'Europe/Madrid',
};

export const madridInput = {
  name: 'Elena Prueba',
  date: '1990-05-17',
  time: '14:30',
  place: madridPlace,
};

export const madridChart = calculateNatalChart(madridInput);
