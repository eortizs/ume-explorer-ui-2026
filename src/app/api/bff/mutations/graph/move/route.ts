import { NextResponse, type NextRequest } from 'next/server';
import { forwardRest } from '@/lib/manageClient';
import { parseSessionHeader, isUuid } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface MoveRequest {
  assetId?: unknown;
  currentParentId?: unknown;
  newParentId?: unknown;
  role?: unknown;
  reason?: unknown;
  edgeProperties?: unknown;
}

const ALLOWED_ROLES = new Set(['contains_component', 'contains_line']);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = parseSessionHeader(req.headers.get('x-ume-session'));
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_SESSION',
          message: 'Missing or invalid x-ume-session header.',
        },
      },
      { status: 400 },
    );
  }

  let body: MoveRequest;
  try {
    body = (await req.json()) as MoveRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Body must be JSON.' } },
      { status: 400 },
    );
  }

  const { assetId, currentParentId, newParentId, role, reason, edgeProperties } = body;
  if (
    typeof assetId !== 'string' ||
    !isUuid(assetId) ||
    typeof currentParentId !== 'string' ||
    !isUuid(currentParentId) ||
    typeof newParentId !== 'string' ||
    !isUuid(newParentId)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'assetId, currentParentId, newParentId must be UUIDs.',
        },
      },
      { status: 400 },
    );
  }

  if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `role must be one of ${Array.from(ALLOWED_ROLES).join(', ')}`,
        },
      },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    assetId,
    currentParentId,
    newParentId,
    role,
  };
  if (typeof reason === 'string' && reason.trim().length > 0) payload.reason = reason;
  if (isObject(edgeProperties)) payload.edgeProperties = edgeProperties;

  const auth = {
    'x-tenant-id': session.tenantId,
    'x-user-id': session.userId,
  } as const;

  try {
    const upstream = await forwardRest(
      'POST',
      '/api/v1/mutations/graph/move',
      payload,
      auth,
    );
    return NextResponse.json(upstream.body, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MANAGE_UNREACHABLE',
          message: `Could not reach ume-management-core: ${(err as Error).message}`,
        },
      },
      { status: 502 },
    );
  }
}