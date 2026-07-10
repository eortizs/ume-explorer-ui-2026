import { NextResponse, type NextRequest } from 'next/server';
import { isUuid } from '@/lib/session';
import { getPool } from '@/lib/pgPool';

export const dynamic = 'force-dynamic';

const SENTINEL_USER =
  '00000000-0000-7000-8000-00000000ae01'; // v7-shaped, all-zero except random tail.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get('id')?.trim() ?? '';
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'id must be a UUID' } },
      { status: 400 },
    );
  }

  let pool;
  try {
    pool = getPool();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'POOL_UNCONFIGURED',
          message: (e as Error).message,
        },
      },
      { status: 503 },
    );
  }

  try {
    const res = await pool.query<{
      id: string;
      type: string;
      name: string;
      tenant_id: string;
    }>(
      `SELECT id, type, name, tenant_id
         FROM entities
        WHERE id = $1
        LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'NOT_FOUND', message: `Entity ${id} not found` },
        },
        { status: 404 },
      );
    }
    const row = res.rows[0];
    return NextResponse.json({
      ok: true,
      id: row.id,
      type: row.type,
      name: row.name,
      tenantId: row.tenant_id,
      // Sentinel user-id is allowed by ume-management-core (header-based auth,
      // no JWT). The DB stores the original createdBy.
      userId: SENTINEL_USER,
      mode: 'resolved-by-id',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'DB_ERROR',
          message: (e as Error).message,
        },
      },
      { status: 502 },
    );
  }
}