# UME Explorer — operational notes

## Read-only by default (resolved-by-id)

`/entity/<uuid>` works **without** the user filling in `HeaderAuthBar`. The
explorer calls `GET /api/bff/entity-tenant?id=<uuid>` which resolves the row
from `entities`, picks a tenant, and binds a **reserved sentinel user-id**
locally so subsequent GraphQL queries have a session.

- Sentinel constant: `00000000-0000-7000-8000-00000000ae01`
  (see `src/lib/session.ts` → `ANONYMOUS_USER_ID`).
- BFF resolvers return `mode: "resolved-by-id"`.
- This session is **read-only**: the UI shows an amber banner, the
  "Mover…" button is disabled, and any BFF POST to
  `/api/bff/mutations/**` returns `403 / ANONYMOUS_READ_ONLY`.
- To mutate, write tenant + a real user UUID into `HeaderAuthBar`.

The exact same sentinel UUID is hard-coded in `ume-management-core`
(`src/lib/anonymousUser.ts → DEFAULT_ANONYMOUS_USER_ID`). Both sides also
honour env override `UME_ANONYMOUS_USER_ID` for future rotation. Override
must match across both services.

## Mutation auth (manage side)

`ume-management-core` enforces `requireNonSentinel(req)` at the top of every
mutation handler (`move`, `link`, `unlink`, `softDelete`, `patchEntity`).
Reads under `/api/v1/graphql` are **not** gated, so the open-by-id path keeps
working.

## Upstream timeouts

`src/lib/manageClient.ts` aborts upstream calls after
`MANAGE_UPSTREAM_TIMEOUT_MS` (default `20_000` ms). On abort, the BFF returns:

| Surface | Status | code |
|---------|--------|------|
| `POST /api/bff/graphql` | 504 | `MANAGE_TIMEOUT` |
| `POST /api/bff/mutations/graph/move` | 504 | `MANAGE_TIMEOUT` |

Other upstream errors stay at `502 / MANAGE_UNREACHABLE`.

## basePath

Client fetches must go through the `bff()` helper
(`src/lib/bffPath.ts`) so they survive the `/explore` nginx prefix. The
`NEXT_PUBLIC_BASE_PATH=/explore` value **must be set at build time** — a
build with an empty prefix serves assets that hit naked `/api/...` paths and
404 on the public surface.

Build:

```bash
cd /home/UME/ume-explorer-ui
export NEXT_PUBLIC_BASE_PATH=/explore
npm run build
sudo systemctl restart ume-explorer
```

Hard refresh the browser tab after each explorer rebuild (JS chunks move).

## Smoke after every deploy

1. `systemctl is-active ume-manage ume-explorer ume-ingest` → all `active`.
2. Concurrent GraphQL: 6× `POST /api/v1/graphql` with the same entity id
   must all return 200 in <200 ms.
3. `GET /explore/api/bff/entity-tenant?id=<known>` → 200 with tenant+userId.
4. `POST /api/v1/mutations/**` with `X-User-ID=ANONYMOUS_USER_ID` → 403
   `FORBIDDEN` containing `ANONYMOUS_READ_ONLY`.
5. `POST /api/v1/mutations/**` with a real UUID user → reaches domain code
   (200 / 4xx / 5xx — never 403).

## Out of residual scope

- `ume-standard` 0.2.1 (JournalEntry + naturalKey/upsert).
- Full RLS enablement (`MANAGE_USE_RLS=1`).