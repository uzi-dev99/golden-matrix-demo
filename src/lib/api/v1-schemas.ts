import { z } from 'zod';
import { birthInputSchema, promptOptionsSchema } from '@/lib/schemas';

export const tokenRequestSchema = z.object({ user: z.string().min(1).max(80), password: z.string().min(1).max(200) });

export const apiReportRequestSchema = z.object({
  input: birthInputSchema,
  options: promptOptionsSchema.default({ tone: 'neutral', length: 'short' }),
  model: z.string().min(1).max(120).optional(),
});
