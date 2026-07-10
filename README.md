# ume-explorer-ui

Ontology graph explorer for the UME ecosystem. Reads from `ume-management-core`
GraphQL (port 3002) via a Next.js BFF; mutations go through the BFF to manage's REST
move endpoint.

## Phase 1 scope (this repo only)

- **Domain-agnostic** explorer over the live UME graph (any `physical_asset`,
  `pos_ticket`, `travel_itinerary`, … renders identically).
- **Discovery** = UUID paste + `localStorage` bookmarks + optional
  `UME_EXPLORER_ROOT_IDS` env seeds (no list/search endpoint in manage yet).
- **Graph tree** = GraphQL `subtree(rootId, maxDepth, role)` → flat → client tree.
- **Journals** = incoming `journal_of` relationships on the focused entity.
- **Move** = `POST /api/bff/mutations/graph/move` → `POST /manage/api/v1/mutations/graph/move`.
- **Auth (Phase 1 header trust)** = `X-Tenant-ID` + `X-User-ID`. The browser stores the
  pair in `localStorage`; the BFF injects the headers on every manage call.

## Out of scope (this phase)

- Drag-drop, multi-parent, soft delete UI, link/unlink UI, property PATCH editor.
- JWT login UI (Phase 3 of manage).
- Tenant-wide list/search (depends on a future manage `entities` query).
- Canvas/graphviz map view.
- Real IdP integration.

## Role split in the ecosystem

| Component | Port | Path | Role |
|---|---|---|---|
| `ume-ingest` | 3001 | `/ingest` | one-way first-write |
| `ume-management-core` | 3002 | `/manage` | GraphQL + REST mutations |
| **`ume-explorer-ui`** | **3003** | **`/explore`** | **human-facing graph explorer + move UX** |

## Quick start

```bash
cd /home/UME/ume-explorer-ui
npm ci
cp .env.example .env.local       # then edit
npm run typecheck
npm run test
npm run dev                       # http://localhost:3003/explore
```

`.env.example`:

```bash
MANAGE_BASE_URL=http://127.0.0.1:3002
PORT=3003
NEXT_PUBLIC_BASE_PATH=/explore
# UME_EXPLORER_ROOT_IDS=0190a3c2-b001-7000-8000-000000000000,0190a3c2-...
```

## Required upstream

`ume-management-core` **must** be running with `MANAGE_GRAPHQL=1` for the explorer to
read. Without that flag, the BFF returns **502 `MANAGE_GRAPHQL_DISABLED`**.

## Validation

- **Offline gate:** `npm run typecheck` + `npm run test` (14 unit tests: tree builder,
  GraphTree 5-level Tina fixture, 404 panel, session round-trip).
- **Manual smoke:** start manage + seed graph → open a root UUID → tree + journals
  render → move a child → new journal appears.

See `docs/API-CLIENT.md` and `docs/DEPLOY.md` for the full contract.