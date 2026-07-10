# Changelog

## 0.1.1 (2026-07-10) — Phase 1 gap fix

Validation follow-up to make the P1 "Done when" smoke pass:

- **F1 Auth**: `tenantId` now accepts any non-empty string (≤ 128 chars), not a UUID.
  `userId` and entity IDs stay UUID-validated. Matches management Phase-1 header
  trust where `X-Tenant-ID` is free-form (`tenant_graphql_a`, `acme-corp`, …).
- **F2 Move path**:
  - `GetEntityExplorer` now requests `containedBy: relationships(role: "contains_component", direction: "incoming")` so the entity page knows its current parent.
  - `EntityClient` derives `defaultParentId` from `containedBy[0].targetId` (was a
    broken `tree[0]` heuristic that always returned `undefined`).
  - `MoveAssetModal` exposes an **editable** `currentParentId` field with the
    detected value prefilled; user can paste if missing.
- **F3 basePath**: `HeaderAuthBar` home link uses `next/link` so `basePath=/explore`
  is respected.
- Session unit tests updated for non-UUID tenants (3 new cases).
- `docs/API-CLIENT.md` updated (tenant rule + `containedBy` fragment).

## 0.1.0 (2026-07-10) — Phase 1 vertical

First explorer-only vertical. New repo `/home/UME/ume-explorer-ui` (package
`ume-explorer-ui-2026`). No commits to `ume-management-core`, `ume-ingest`, or
`ume-standard` in this phase.

Added:
- Next.js 15 App Router skeleton on **port 3003** with Tailwind CSS.
- `TenantUserContext` (localStorage-backed creds) + `HeaderAuthBar`.
- BFF: `POST /api/bff/graphql` and `POST /api/bff/mutations/graph/move`
  (forwards to `MANAGE_BASE_URL`, default `http://127.0.0.1:3002`).
- Entity page (`/entity/[id]`) driven by `GetEntityExplorer` + `GetSubtree`
  adapted from the live management SDL (no nested property selections; subtree
  used for the infinite-ish tree).
- `GraphTree` (recursive render, hard cap 32), `JournalStream` (incoming
  `journal_of`), `MoveAssetModal` (REST move), `EntityNotFound` (404 panel).
- `treeFromSubtree` pure helper (flat `SubtreeNode[]` → `TreeNode[]`).
- Home page: UUID paste + `localStorage` bookmarks + optional
  `UME_EXPLORER_ROOT_IDS` env seeds.
- 14 unit tests (tree builder, GraphTree 5-level Tina fixture, 404 panel, session
  round-trip). All green offline.
- `docs/API-CLIENT.md` + `docs/DEPLOY.md` (3003 + nginx `/explore`).

Known limitations:
- Auth is header trust (`X-Tenant-ID` + `X-User-ID`); no JWT verification yet
  (managed by manage `MANAGE_STRICT_AUTH=1` gate, Phase 3).
- No tenant-wide list/search UI; discovery is UUID-only.