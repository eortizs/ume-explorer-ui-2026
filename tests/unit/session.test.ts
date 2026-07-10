import { describe, expect, it } from 'vitest';
import {
  encodeSessionHeader,
  isTenantId,
  isUserId,
  isUuid,
  parseSessionHeader,
} from '@/lib/session';

describe('session', () => {
  it('round-trips valid UUIDs (tenant string + user UUID)', () => {
    const creds = {
      tenantId: 'tenant_graphql_a',
      userId: '0190a3c2-b001-7000-8000-000000000000',
    };
    const encoded = encodeSessionHeader(creds);
    const decoded = parseSessionHeader(encoded);
    expect(decoded).toEqual(creds);
  });

  it('accepts free-string tenant IDs (not UUID)', () => {
    expect(isTenantId('tenant_graphql_a')).toBe(true);
    expect(isTenantId('acme-corp')).toBe(true);
  });

  it('rejects empty or oversized tenant', () => {
    expect(isTenantId('')).toBe(false);
    expect(isTenantId('   ')).toBe(false);
    expect(isTenantId('x'.repeat(129))).toBe(false);
  });

  it('requires userId to be a UUID', () => {
    expect(isUserId('0190a3c2-b001-7000-8000-000000000000')).toBe(true);
    expect(isUserId('system_user')).toBe(false);
    expect(isUserId('')).toBe(false);
  });

  it('rejects session header with non-UUID userId', () => {
    const encoded = encodeSessionHeader({
      tenantId: 'tenant_graphql_a',
      userId: 'not-a-uuid',
    });
    expect(parseSessionHeader(encoded)).toBeNull();
  });

  it('rejects session header with empty tenant', () => {
    const encoded = encodeSessionHeader({
      tenantId: '',
      userId: '0190a3c2-b001-7000-8000-000000000000',
    });
    expect(parseSessionHeader(encoded)).toBeNull();
  });

  it('returns null on garbage input', () => {
    expect(parseSessionHeader(null)).toBeNull();
    expect(parseSessionHeader('not base64!!')).toBeNull();
    expect(parseSessionHeader(Buffer.from('not json').toString('base64'))).toBeNull();
  });

  it('isUuid accepts canonical v4-like format', () => {
    expect(isUuid('0190a3c2-b001-7000-8000-000000000000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});