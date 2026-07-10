'use client';

import { useCallback, useEffect, useState } from 'react';
import HeaderAuthBar from '@/components/HeaderAuthBar';
import { GraphTree } from '@/components/GraphTree';
import { JournalStream } from '@/components/JournalStream';
import { MoveAssetModal } from '@/components/MoveAssetModal';
import { EntityNotFound } from '@/components/EntityNotFound';
import { useTenantUser } from '@/context/TenantUserContext';
import { ENTITY_QUERY, SUBTREE_QUERY } from '@/lib/queries';
import { encodeSessionHeader, isUuid } from '@/lib/session';
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

const DEFAULT_MAX_DEPTH = 8;

export default function EntityClient({ id }: { id: string }) {
  const { creds } = useTenantUser();
  const [entity, setEntity] = useState<EntityPayload['entity'] | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!creds) {
      setEntity(null);
      setTree([]);
      setJournals([]);
      setLoading(false);
      return;
    }
    if (!isUuid(id)) {
      setError('ID inválido.');
      setEntity(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const sessionHeader = encodeSessionHeader(creds);

    (async () => {
      try {
        const [entityRes, subtreeRes] = await Promise.all([
          fetch('/api/bff/graphql', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-ume-session': sessionHeader,
            },
            body: JSON.stringify({ query: ENTITY_QUERY, variables: { id } }),
            signal: controller.signal,
          }),
          fetch('/api/bff/graphql', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-ume-session': sessionHeader,
            },
            body: JSON.stringify({
              query: SUBTREE_QUERY,
              variables: { rootId: id, maxDepth: DEFAULT_MAX_DEPTH },
            }),
            signal: controller.signal,
          }),
        ]);

        if (!entityRes.ok) {
          const data = await entityRes.json().catch(() => ({}));
          throw new Error(
            data?.error?.message ??
              `Entity fetch failed (HTTP ${entityRes.status})`,
          );
        }
        if (!subtreeRes.ok) {
          const data = await subtreeRes.json().catch(() => ({}));
          throw new Error(
            data?.error?.message ??
              `Subtree fetch failed (HTTP ${subtreeRes.status})`,
          );
        }

        const entityBody = (await entityRes.json()) as {
          data?: EntityPayload;
          errors?: Array<{ message: string }>;
        };
        if (entityBody.errors?.length) {
          throw new Error(entityBody.errors.map((e) => e.message).join('; '));
        }
        const subtreeBody = (await subtreeRes.json()) as {
          data?: SubtreePayload;
          errors?: Array<{ message: string }>;
        };
        if (subtreeBody.errors?.length) {
          throw new Error(subtreeBody.errors.map((e) => e.message).join('; '));
        }

        setEntity(entityBody.data?.entity ?? null);
        setTree(treeFromSubtree(subtreeBody.data?.subtree ?? [], { rootId: id }));
        const journalRows: JournalEntry[] = (
          entityBody.data?.entity?.journals ?? []
        )
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
  }, [id, creds, reloadKey]);

  if (!creds) {
    return (
      <main>
        <HeaderAuthBar />
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          Configura tenant y usuario en la barra superior.
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