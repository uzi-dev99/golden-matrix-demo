import { z } from 'zod';
import { LENGTHS, TONES } from '@/lib/types';
import { isValidTimeZone } from '@/lib/timezone';
import { FENCE_DELIMITERS } from '@/lib/prompt/render';

/**
 * Frees the text of control and format characters (newlines, bidi overrides, zero-width) and of the
 * fence delimiters: one line, one space between words, and never an empty block in the prompt.
 */
const plain = (s: string) =>
  s.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(FENCE_DELIMITERS, ' ').replace(/\s+/g, ' ').trim();

export const birthInputSchema = z.object({
  name: z.string().transform(plain).pipe(z.string().min(1, 'Escribe un nombre').max(80, 'Nombre demasiado largo')),
  date: z.iso.date('Fecha inválida'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)'),
  place: z.object({
    label: z.string().transform(plain).pipe(z.string().min(1).max(200)),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().refine(isValidTimeZone, 'Zona horaria inválida'),
  }),
});

export const promptOptionsSchema = z.object({ tone: z.enum(TONES), length: z.enum(LENGTHS) });

export const reportRequestSchema = z.object({
  input: birthInputSchema,
  options: promptOptionsSchema,
  model: z.string().min(1).max(120),
});

export const previewRequestSchema = reportRequestSchema.omit({ model: true });
