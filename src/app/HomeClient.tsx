'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import HeaderAuthBar from '@/components/HeaderAuthBar';
import { useTenantUser } from '@/context/TenantUserContext';
import { isUuid } from '@/lib/session';

export interface HomeClientProps {
  envRoots: string[];
}

export default function HomeClient({ envRoots }: HomeClientProps) {
  const router = useRouter();
  const { creds, bookmarks, addBookmark, removeBookmark } = useTenantUser();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function open(id: string) {
    if (!isUuid(id)) {
      setError('UUID inválido.');
      return;
    }
    setError(null);
    addBookmark(id);
    router.push(`/entity/${id}`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    open(input.trim());
  }

  const hasList = envRoots.length > 0 || bookmarks.length > 0;

  return (
    <main>
      <HeaderAuthBar />

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Abrir entidad por UUID</h1>
        <p className="mt-1 text-sm text-slate-500">
          Exploración por UUID (no hay endpoint de listado en Phase 1). Pega el ID para abrir
          el árbol de contención y la bitácora de bitácora.
        </p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            data-testid="open-uuid-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0190a3c2-b001-7000-8000-000000000000"
            className="flex-1 rounded border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Abrir
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </section>

      {!creds && (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          Configura <strong>tenant</strong> y <strong>user</strong> en la barra superior
          antes de abrir entidades. El servidor BFF inyecta esos headers a cada llamada a
          ume-management-core.
        </section>
      )}

      {hasList && (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {bookmarks.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">Recientes (localStorage)</h2>
              <ul className="mt-3 space-y-2 text-xs">
                {bookmarks.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => open(id)}
                      className="flex-1 truncate rounded px-2 py-1 text-left font-mono text-indigo-700 hover:bg-indigo-50"
                    >
                      {id}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(id)}
                      className="rounded border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50"
                      aria-label={`Quitar ${id}`}
                    >
                      quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {envRoots.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">
                Raíces del entorno (UME_EXPLORER_ROOT_IDS)
              </h2>
              <ul className="mt-3 space-y-2 text-xs">
                {envRoots.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => open(id)}
                      className="w-full truncate rounded px-2 py-1 text-left font-mono text-indigo-700 hover:bg-indigo-50"
                    >
                      {id}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}