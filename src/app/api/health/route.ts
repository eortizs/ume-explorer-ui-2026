import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    service: 'ume-explorer-ui',
    timestamp: new Date().toISOString(),
  });
}