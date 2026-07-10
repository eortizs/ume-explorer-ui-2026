import 'server-only';
import type { ManageResponse } from './types';

export const MANAGE_BASE_URL = (
  process.env.MANAGE_BASE_URL ?? 'http://127.0.0.1:3002'
).replace(/\/$/, '');

/** Upstream timeout — fail fast so nginx never serves a blank 504 cascade. */
export function manageTimeoutMs(): number {
  const v = Number(process.env.MANAGE_UPSTREAM_TIMEOUT_MS ?? '20_000');
  if (!Number.isFinite(v) || v < 2_000) return 20_000;
  return Math.floor(v);
}

/** Marker error thrown by timedFetch on AbortError — distinguishable by callers. */
export class ManageTimeoutError extends Error {
  readonly code = 'MANAGE_TIMEOUT';
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`ume-management-core timeout after ${timeoutMs}ms`);
    this.name = 'ManageTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export interface AuthHeaders {
  'x-tenant-id': string;
  'x-user-id': string;
  authorization?: string;
}

async function timedFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const timeoutMs = manageTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ManageTimeoutError(timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function isManageTimeout(err: unknown): err is ManageTimeoutError {
  return (
    err instanceof ManageTimeoutError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'MANAGE_TIMEOUT')
  );
}

export async function forwardGraphql(
  query: string,
  variables: Record<string, unknown> | null,
  auth: AuthHeaders,
): Promise<{ status: number; body: unknown }> {
  const res = await timedFetch(`${MANAGE_BASE_URL}/api/v1/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...auth,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
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
  const res = await timedFetch(`${MANAGE_BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...auth,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
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