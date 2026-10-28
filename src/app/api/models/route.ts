import { allowedModels, defaultModel } from '@/lib/config';
import { internalError, ok } from '@/lib/api/envelope';
import { listModels } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ models: await listModels(allowedModels()), default: defaultModel() });
  } catch (e) {
    return internalError(e, 'api/models');
  }
}
