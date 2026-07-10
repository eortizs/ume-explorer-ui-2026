'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useTenantUser } from '@/context/TenantUserContext';
import { isTenantId, isUserId } from '@/lib/session';

export default function HeaderAuthBar() {
  const { creds, setCreds, clear } = useTenantUser();
  const [tenantId, setTenantId] = useState(creds?.tenantId ?? '');
  const [userId, setUserId] = useState(creds?.userId ?? '');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = tenantId.trim();
    const u = userId.trim();
    if (!isTenantId(t)) {
      setError('Tenant must be a non-empty string (max 128 chars).');
      return;
    }
    if (!isUserId(u)) {
      setError('User must be a UUID.');
      return;
    }
    setError(null);
    setCreds({ tenantId: t, userId: u });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-6 py-3">
        <Link href="/" className="text-base font-semibold text-slate-800">
          UME Explorer
        </Link>
        <span className="text-xs text-slate-500">ontology graph · phase 1</span>

        <form onSubmit={onSubmit} className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span>Tenant</span>
            <input
              data-testid="auth-tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="e.g. tenant_graphql_a"
              className="w-44 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span>User</span>
            <input
              data-testid="auth-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="uuid"
              className="w-44 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Save
          </button>
          {creds && (
            <button
              type="button"
              onClick={clear}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </form>
      </div>
      {error && (
        <div className="mx-auto max-w-[1200px] px-6 pb-2 text-xs text-red-700">{error}</div>
      )}
      {creds && (
        <div className="mx-auto max-w-[1200px] px-6 pb-2 text-[11px] text-slate-500">
          bound tenant <span className="font-mono">{creds.tenantId}</span> · user{' '}
          <span className="font-mono">{creds.userId.slice(0, 8)}…</span>
        </div>
      )}
    </header>
  );
}