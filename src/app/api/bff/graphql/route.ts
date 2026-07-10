import { NextResponse, type NextRequest } from 'next/server';
import { forwardGraphql } from '@/lib/manageClient';
import { parseSessionHeader } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface RequestBody {
  query?: string;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = parseSessionHeader(req.headers.get('x-ume-session'));
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_SESSION',
          message:
            'Missing or invalid x-ume-session header. Configure tenant + user in HeaderAuthBar.',
        },
      },
      { status: 400 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Body must be JSON.' } },
      { status: 400 },
    );
  }

  if (typeof body.query !== 'string' || body.query.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Field `query` is required.' } },
      { status: 400 },
    );
  }

  const auth = {
    'x-tenant-id': session.tenantId,
    'x-user-id': session.userId,
  } as const;

  try {
    const upstream = await forwardGraphql(body.query, body.variables ?? null, auth);
    if (upstream.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MANAGE_GRAPHQL_DISABLED',
            message:
              'Management GraphQL endpoint returned 404. Ensure management was started with MANAGE_GRAPHQL=1.',
          },
        },
        { status: 502 },
      );
    }
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