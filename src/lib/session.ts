const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TENANT_LEN = 128;
const MAX_USER_LEN = 128;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function isTenantId(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.length <= MAX_TENANT_LEN;
}

export function isUserId(value: string): boolean {
  return isUuid(value) && value.trim().length <= MAX_USER_LEN;
}

export const ANONYMOUS_USER_ID =
  '00000000-0000-7000-8000-00000000ae01';

export interface SessionCreds {
  tenantId: string;
  userId: string;
}

export function parseSessionHeader(value: string | null | undefined): SessionCreds | null {
  if (!value) return null;
  const decoded = (() => {
    try {
      return Buffer.from(value, 'base64').toString('utf8');
    } catch {
      return null;
    }
  })();
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded) as Partial<SessionCreds>;
    if (
      typeof parsed.tenantId === 'string' &&
      typeof parsed.userId === 'string' &&
      isTenantId(parsed.tenantId) &&
      isUserId(parsed.userId)
    ) {
      return { tenantId: parsed.tenantId.trim(), userId: parsed.userId.trim() };
    }
  } catch {
    /* swallow */
  }
  return null;
}

export function encodeSessionHeader(creds: SessionCreds): string {
  return Buffer.from(JSON.stringify(creds), 'utf8').toString('base64');
}