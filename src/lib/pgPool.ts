import 'server-only';
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __umeExplorerPool: Pool | undefined;
}

function buildPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured for ume-explorer-ui. Set it in /etc/ume/ume-explorer.env.',
    );
  }
  return new Pool({
    connectionString: url,
    max: Number(process.env.UME_EXPLORER_PG_POOL_MAX ?? '4'),
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!globalThis.__umeExplorerPool) {
    globalThis.__umeExplorerPool = buildPool();
  }
  return globalThis.__umeExplorerPool;
}