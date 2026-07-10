'use client';

import { useCallback, useEffect, useState } from 'react';
import HeaderAuthBar from '@/components/HeaderAuthBar';
import { GraphTree } from '@/components/GraphTree';
import { JournalStream } from '@/components/JournalStream';
import { MoveAssetModal } from '@/components/MoveAssetModal';
import { EntityNotFound } from '@/components/EntityNotFound';
import { useTenantUser } from '@/context/TenantUserContext';
import { ENTITY_QUERY, SUBTREE_QUERY } from '@/lib/queries';
import {
  ANONYMOUS_USER_ID,
  encodeSessionHeader,
  isUuid,
} from '@/lib/session';
import { bff } from '@/lib/bffPath';
import { defaultSubtreeRole } from '@/lib/subtreeRoles';
import { treeFromSubtree } from '@/lib/treeFromSubtree';
import type {
  JournalEntry,
  Relationship,
  SubtreeNode,
  TreeNode,
  UmeEntity,
} from '@/lib/types';

interface EntityPayload {
  entity: (UmeEntity & {
    children: Array<Relationship>;
    containedBy: Array<Relationship>;
    journals: Array<Relationship>;
  }) | null;
}

interface SubtreePayload {
  subtree: SubtreeNode[];
}

interface ResolvedTenant {
  tenantId: string;
  userId: string;
  type: string;
  name: string;
  mode: 'resolved-by-id';
}

const DEFAULT_MAX_DEPTH = 8;

export default function EntityClient({ id }: { id: string }) {
  const { creds, setCreds } = useTenantUser();
  const [entity, setEntity] = useState<EntityPayload['entity'] | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedTenant | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // Resolve tenant from entity id when no creds are set.
  useEffect(() => {
    if (creds) {
      setResolved(null);
      return;
    }
    if (!isUuid(id)) {
      setError('ID inválido.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch(
          bff(`/api/bff/entity-tenant?id=${encodeURIComponent(id)}`),
          { cache: 'no-store' },
        );
        const j = (await r.json()) as {
          ok: boolean;
          tenantId?: string;
          userId?: string;
          type?: string;
          name?: string;
          mode?: 'resolved-by-id';
          error?: { code: string; message: string };
        };
        if (cancelled) return;
        if (!r.ok || !j.ok) {
          setError(j.error?.message ?? `Lookup failed (HTTP ${r.status})`);
          setLoading(false);
          return;
        }
        const next: ResolvedTenant = {
          tenantId: j.tenantId!,
          userId: j.userId ?? ANONYMOUS_USER_ID,
          type: j.type!,
          name: j.name!,
          mode: 'resolved-by-id',
        };
        setResolved(next);
        // Auto-bind session so subsequent GraphQL calls succeed.
        setCreds({ tenantId: next.tenantId, userId: next.userId });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, creds, setCreds]);

  useEffect(() => {
    const effectiveCreds = creds ?? (resolved ? { tenantId: resolved.tenantId, userId: resolved.userId } : null);
    if (!effectiveCreds) return;
    if (!isUuid(id)) {
      setError('ID inválido.');
      setEntity(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const sessionHeader = encodeSessionHeader(effectiveCreds);

    (async () => {
      try {
        // 1) Load entity first so we can pick the correct composition role.
        const entityRes = await fetch(bff('/api/bff/graphql'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ume-session': sessionHeader,
          },
          body: JSON.stringify({ query: ENTITY_QUERY, variables: { id } }),
          signal: controller.signal,
        });
        if (!entityRes.ok) {
          const data = await entityRes.json().catch(() => ({}));
          throw new Error(
            data?.error?.message ??
              `Entity fetch failed (HTTP ${entityRes.status})`,
          );
        }
        const entityBody = (await entityRes.json()) as {
          data?: EntityPayload;
          errors?: Array<{ message: string }>;
        };
        if (entityBody.errors?.length) {
          throw new Error(entityBody.errors.map((e) => e.message).join('; '));
        }
        const loaded = entityBody.data?.entity ?? null;
        setEntity(loaded);

        // 2) Subtree with role from entity type (fallbacks: resolved hint → contains_component).
        const treeRole = defaultSubtreeRole(
          loaded?.type ?? resolved?.type ?? null,
        );
        const subtreeRes = await fetch(bff('/api/bff/graphql'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ume-session': sessionHeader,
          },
          body: JSON.stringify({
            query: SUBTREE_QUERY,
            variables: {
              rootId: id,
              maxDepth: DEFAULT_MAX_DEPTH,
              role: treeRole,
            },
          }),
          signal: controller.signal,
        });
        if (!subtreeRes.ok) {
          const data = await subtreeRes.json().catch(() => ({}));
          throw new Error(
            data?.error?.message ??
              `Subtree fetch failed (HTTP ${subtreeRes.status})`,
          );
        }
        const subtreeBody = (await subtreeRes.json()) as {
          data?: SubtreePayload;
          errors?: Array<{ message: string }>;
        };
        if (subtreeBody.errors?.length) {
          throw new Error(subtreeBody.errors.map((e) => e.message).join('; '));
        }

        setTree(
          treeFromSubtree(subtreeBody.data?.subtree ?? [], {
            rootId: id,
            edgeRole: treeRole,
          }),
        );
        const journalRows: JournalEntry[] = (loaded?.journals ?? [])
          .map((j) => j.targetEntity as unknown as JournalEntry | null)
          .filter((t): t is JournalEntry => t !== null);
        setJournals(journalRows);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id, creds, resolved, reloadKey]);

  if (!creds && !resolved) {
    return (
      <main>
        <HeaderAuthBar />
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          Resolviendo tenant desde el ID…
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main>
        <HeaderAuthBar />
        <p className="mt-6 text-sm text-slate-500">Cargando {id.slice(0, 8)}…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <HeaderAuthBar />
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </section>
      </main>
    );
  }

  if (!entity) {
    return (
      <main>
        <HeaderAuthBar />
        <EntityNotFound id={id} />
      </main>
    );
  }

  const defaultParentId = entity.containedBy?.[0]?.targetId ?? undefined;

  return (
    <main>
      <HeaderAuthBar />
      {resolved && resolved.mode === 'resolved-by-id' && (
        <div className="mx-auto mt-2 max-w-[1200px] px-6 text-[11px] text-slate-500">
          Sesión anónima autocompletada desde el ID: tenant{' '}
          <span className="font-mono">{resolved.tenantId}</span> · user{' '}
          <span className="font-mono">{(resolved.userId ?? ANONYMOUS_USER_ID).slice(0, 8)}…</span>
          {' '}(solo lectura — escribe en la barra superior para mutar).
        </div>
      )}

      <section className="mt-4 flex flex-wrap items-baseline justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{entity.name}</h1>
          <p className="mt-1 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase text-slate-700">
              {entity.type}
            </span>{' '}
            ·{' '}
            <span className="font-mono">{entity.id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMove(true)}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Mover…
        </button>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Árbol de contención (subtree · max {DEFAULT_MAX_DEPTH})
          </h2>
          {tree.length === 0 ? (
            <p className="mt-3 text-sm italic text-slate-400">
              Sin descendientes en este rol.
            </p>
          ) : (
            <div className="mt-3">
              {tree.map((n) => (
                <GraphTree key={n.id} node={n} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Bitácora (incoming journals)</h2>
          <JournalStream journals={journals} />
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Markdown</h2>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
          {entity.markdown || '(vacío)'}
        </pre>
      </section>

      {showMove && (
        <MoveAssetModal
          assetId={entity.id}
          currentParentId={defaultParentId}
          onClose={() => setShowMove(false)}
          onMoved={() => {
            setShowMove(false);
            refresh();
          }}
        />
      )}
    </main>
  );
}