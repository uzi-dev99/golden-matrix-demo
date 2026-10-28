import { NextResponse } from 'next/server';
import { openApiDocument } from '@/lib/api/openapi';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(openApiDocument());
}
