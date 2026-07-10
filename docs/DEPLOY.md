# Deploy (ume-explorer-ui)

## Port and reverse proxy

| Component | Port | Reverse proxy path |
|---|---|---|
| `ume-ingest` | 3001 | `/ingest` |
| `ume-management-core` | 3002 | `/manage` (REST + GraphQL) |
| **`ume-explorer-ui`** | **3003** | **`/explore`** |

Run the explorer on **3003** by default (`PORT=3003`). The Next.js `basePath` and
`assetPrefix` are driven by `NEXT_PUBLIC_BASE_PATH` (default `/explore`) so it composes
cleanly behind the existing nginx config that already proxies `/ingest` and `/manage`.

Sample nginx fragment (sibling to the `/ingest` + `/manage` locations in
`ume-management-core/deploy/nginx.conf`):

```nginx
location /explore/ {
    proxy_pass http://127.0.0.1:3003/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `MANAGE_BASE_URL` | `http://127.0.0.1:3002` | Where BFF proxies GraphQL + REST to |
| `PORT` | `3003` | `next dev` / `next start` port |
| `NEXT_PUBLIC_BASE_PATH` | `/explore` | Sets Next `basePath` + `assetPrefix` at build time |
| `UME_EXPLORER_ROOT_IDS` | _(unset)_ | Comma-separated UUIDs shown on the home page as env seed roots |
| `LOG_LEVEL` | _(unset)_ | Reserved for future structured logging |

## Required upstream state

`ume-management-core` **must** be started with `MANAGE_GRAPHQL=1` for the explorer to
read anything. Without it, `/api/v1/graphql` returns 404 and the BFF surfaces
**502 `MANAGE_GRAPHQL_DISABLED`**.

The `ume-pg` (Postgres, port 54329) backing manage must be reachable from the manage
process. The explorer itself never opens a DB connection.

## Build + run

```bash
cd /home/UME/ume-explorer-ui
npm ci
npm run typecheck
npm run test
npm run build
PORT=3003 npm start          # or `npm run dev` for development
```

## Health probe

`GET /api/health` → `{ ok: true, service: "ume-explorer-ui", timestamp: "..." }`. This
probes the explorer itself, not manage. (Manage liveness is `/manage/health` on the
existing management deploy.)

## Smoke (manual)

1. Start manage with `MANAGE_GRAPHQL=1` against a seeded graph.
2. Start the explorer on `:3003` (or behind `/explore`).
3. Open `/`, set tenant + user UUIDs in the header bar, paste a root UUID, click
   "Abrir". Expect the GraphTree + JournalStream to render.
4. Click "Mover…", fill `newParentId` (UUID), submit. Expect the tree to refresh and a
   new journal entry to appear in the stream.