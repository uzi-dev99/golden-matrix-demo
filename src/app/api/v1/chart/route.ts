import { requireBearer } from '@/lib/auth/bearer';
import { POST as chart } from '@/app/api/chart/route';

/** Same contract as the app's /api/chart, behind a Bearer token instead of the session cookie. */
export async function POST(req: Request) {
  return (await requireBearer(req)) ?? chart(req);
}
