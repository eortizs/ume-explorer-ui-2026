export interface EntityNotFoundProps {
  id: string;
}

export function EntityNotFound({ id }: EntityNotFoundProps) {
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-8 text-center"
      data-testid="entity-not-found"
    >
      <h2 className="text-lg font-semibold text-slate-800">404 — Acceso no autorizado</h2>
      <p className="mt-2 text-sm text-slate-500">
        No se encontró ninguna entidad para{' '}
        <span className="font-mono text-slate-700">{id.slice(0, 8)}…</span> en este tenant.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        La entidad puede pertenecer a otro tenant, haber sido eliminada, o el UUID es
        incorrecto. Verifica que el header de tenant esté configurado.
      </p>
    </section>
  );
}