'use client';

import { useState, type FormEvent } from 'react';
import { useTenantUser } from '@/context/TenantUserContext';
import { encodeSessionHeader, isUuid } from '@/lib/session';

export interface MoveAssetModalProps {
  assetId: string;
  currentParentId?: string;
  onClose: () => void;
  onMoved: () => void;
}

interface MoveError {
  code: string;
  message: string;
}

export function MoveAssetModal({
  assetId,
  currentParentId,
  onClose,
  onMoved,
}: MoveAssetModalProps) {
  const { creds } = useTenantUser();
  const [parentId, setParentId] = useState(currentParentId ?? '');
  const [newParentId, setNewParentId] = useState('');
  const [role, setRole] = useState<'contains_component' | 'contains_line'>(
    'contains_component',
  );
  const [reason, setReason] = useState('');
  const [relevance, setRelevance] = useState<'critical' | 'medium' | 'low'>('medium');
  const [criticality, setCriticality] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<MoveError | null>(null);

  if (!creds) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40">
        <div className="max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h3 className="text-base font-semibold">Sesión requerida</h3>
          <p className="mt-2 text-sm text-slate-600">
            Configura tenant y usuario en la barra superior antes de mover activos.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-3 py-1 text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parent = parentId.trim();
    const next = newParentId.trim();

    if (!isUuid(parent)) {
      setError({
        code: 'BAD_REQUEST',
        message: 'currentParentId debe ser un UUID (pega el padre actual).',
      });
      return;
    }
    if (!isUuid(next)) {
      setError({ code: 'BAD_REQUEST', message: 'newParentId debe ser UUID.' });
      return;
    }
    if (next === parent) {
      setError({
        code: 'BAD_REQUEST',
        message: 'El nuevo padre no puede ser igual al actual.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bff/mutations/graph/move', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ume-session': encodeSessionHeader(creds!),
        },
        body: JSON.stringify({
          assetId,
          currentParentId: parent,
          newParentId: next,
          role,
          reason: reason.trim() || undefined,
          edgeProperties: {
            relevance,
            criticality_score: Number(criticality.toFixed(2)),
          },
        }),
      });
      const data = (await res.json()) as
        | { success: true; message?: string; data?: unknown }
        | { success: false; error: MoveError };
      if (!res.ok || data.success === false) {
        const err =
          'error' in data
            ? data.error
            : { code: 'UNKNOWN', message: `HTTP ${res.status}` };
        setError(err);
        return;
      }
      onMoved();
    } catch (e) {
      setError({ code: 'NETWORK', message: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg space-y-3 rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Mover activo</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded text-slate-400 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold">Activo:</span>{' '}
            <span className="font-mono">{assetId.slice(0, 8)}…</span>
          </div>
        </div>

        <label className="block text-xs">
          Padre actual (UUID)
          <input
            data-testid="move-current-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder="uuid del padre que contiene este activo"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          />
          {!currentParentId && (
            <span className="mt-1 block text-[10px] text-slate-500">
              No se detectó padre automático. Pega el UUID del padre actual.
            </span>
          )}
        </label>

        <label className="block text-xs">
          Nuevo padre (UUID)
          <input
            data-testid="move-new-parent"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            placeholder="uuid"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          />
        </label>

        <label className="block text-xs">
          Rol
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="contains_component">contains_component</option>
            <option value="contains_line">contains_line</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs">
            Relevance
            <select
              value={relevance}
              onChange={(e) => setRelevance(e.target.value as typeof relevance)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="critical">critical</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
          <label className="block text-xs">
            Criticality score (0–1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={criticality}
              onChange={(e) => setCriticality(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>

        <label className="block text-xs">
          Razón (bitácora)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </label>

        {error && (
          <div
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            data-testid="move-error"
          >
            <div className="font-mono">{error.code}</div>
            <div>{error.message}</div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1 text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:bg-indigo-300"
          >
            {submitting ? 'Moviendo…' : 'Mover'}
          </button>
        </div>
      </form>
    </div>
  );
}