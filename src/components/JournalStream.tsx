'use client';

import type { JournalEntry } from '@/lib/types';

export interface JournalStreamProps {
  journals: JournalEntry[];
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function JournalStream({ journals }: JournalStreamProps) {
  if (!journals || journals.length === 0) {
    return (
      <p className="mt-4 text-sm italic text-slate-400">
        No hay registros de bitácora para este nodo.
      </p>
    );
  }

  const sorted = [...journals].sort((a, b) =>
    a.lifecycle.createdAt < b.lifecycle.createdAt ? 1 : -1,
  );

  return (
    <div className="mt-4">
      <ul className="space-y-4">
        {sorted.map((entry, idx) => {
          const author =
            entry.lifecycle.createdBy ??
            (typeof entry.properties?.created_by === 'string'
              ? (entry.properties.created_by as string)
              : 'system');
          return (
            <li key={entry.id ?? idx} className="flex space-x-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 font-mono text-xs font-bold text-indigo-600">
                J
              </div>
              <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700" data-testid="journal-author">
                    Autor: {author}
                  </span>
                  <span>{formatDate(entry.lifecycle.createdAt)}</span>
                </div>
                <div className="whitespace-pre-line font-sans text-sm text-slate-600">
                  {entry.markdown || entry.name}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}