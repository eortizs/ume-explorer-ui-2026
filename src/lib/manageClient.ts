import 'server-only';
import type { ManageResponse } from './types';

export const MANAGE_BASE_URL = (
  process.env.MANAGE_BASE_URL ?? 'http://127.0.0.1:3002'
).replace(/\/$/, '');

export interface AuthHeaders {
  'x-tenant-id': string;
  'x-user-id': string;
  authorization?: string;
}

export async function forwardGraphql(
  query: string,
  variables: Record<string, unknown> | null,
  auth: AuthHeaders,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${MANAGE_BASE_URL}/api/v1/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...auth,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
    cache: 'no-store',
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}

export async function forwardRest(
  method: 'POST' | 'PATCH',
  path: string,
  body: unknown,
  auth: AuthHeaders,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; body: ManageResponse<unknown> | unknown }> {
  const res = await fetch(`${MANAGE_BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...auth,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
}