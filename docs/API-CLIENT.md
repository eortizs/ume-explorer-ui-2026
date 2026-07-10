# API Client (ume-explorer-ui → ume-management-core)

The explorer **never** talks to `ume-management-core` (`MANAGE_BASE_URL`, default
`http://127.0.0.1:3002`) directly from the browser. Every request is proxied through the
**BFF route handlers** under `src/app/api/bff/`:

| BFF route | Forwards to | Auth source |
|---|---|---|
| `POST /api/bff/graphql` | `POST {MANAGE_BASE_URL}/api/v1/graphql` | `x-ume-session` header (browser) → decodes into `X-Tenant-ID` + `X-User-ID` |
| `POST /api/bff/mutations/graph/move` | `POST {MANAGE_BASE_URL}/api/v1/mutations/graph/move` | same |

The `x-ume-session` value is `base64(JSON.stringify({tenantId, userId}))`.
- `tenantId`: free string (≤ 128 chars, trimmed). Matches management Phase-1
  header-trust (`X-Tenant-ID` is not constrained to UUID).
- `userId`: UUID, must resolve to a `system_user` in the same tenant.

Missing or malformed session returns **400 `MISSING_SESSION`**.

The BFF rejects manage `404` from `/api/v1/graphql` with **502 `MANAGE_GRAPHQL_DISABLED`**,
instructing the operator to start manage with `MANAGE_GRAPHQL=1`.

## GraphQL queries

### Entity + one-hop children + incoming journals + incoming containment parent

```graphql
query GetEntityExplorer($id: ID!) {
  entity(id: $id) {
    id name type tenant markdown properties
    lifecycle { state createdAt updatedAt createdBy }
    children: relationships(role: "contains_component", direction: "outgoing") {
      targetId targetType role direction properties
      targetEntity { id name type properties }
    }
    containedBy: relationships(role: "contains_component", direction: "incoming") {
      targetId targetType role direction
      targetEntity { id name type }
    }
    journals: relationships(role: "journal_of", direction: "incoming") {
      targetId
      targetEntity {
        id name type markdown properties
        lifecycle { state createdAt updatedAt createdBy }
      }
    }
  }
}
```

`properties` is a JSON scalar — selections like `properties { relevance criticality_score }`
are **not** valid in the live SDL. Edge properties are read client-side from the JSON blob
after fetch.

### Subtree (infinite-ish tree)

```graphql
query GetSubtree($rootId: ID!, $maxDepth: Int, $role: String) {
  subtree(rootId: $rootId, maxDepth: $maxDepth, role: $role) {
    id type name depth parentId
  }
}
```

`maxDepth` defaults to `5` on the server and is hard-capped at `32`
(`SUBTREE_HARD_MAX_DEPTH`). The UI requests `maxDepth: 8`.

## Move (REST)

```http
POST /api/bff/mutations/graph/move
Content-Type: application/json
x-ume-session: <base64 creds>

{
  "assetId": "<uuid>",
  "currentParentId": "<uuid>",
  "newParentId": "<uuid>",
  "role": "contains_component",
  "reason": "Reemplazo preventivo…",
  "edgeProperties": {
    "relevance": "medium",
    "criticality_score": 0.6
  }
}
```

The BFF forwards the body verbatim to `POST /api/v1/mutations/graph/move` and returns the
management response envelope. Allowed roles: `contains_component`, `contains_line`. Bad
UUIDs → **400 `BAD_REQUEST`**. Missing session → **400 `MISSING_SESSION`**. Manage
unreachable → **502 `MANAGE_UNREACHABLE`**.

## Tenant isolation

The management resolver returns `entity(id) === null` for unknown or foreign-tenant IDs.
The explorer renders the `EntityNotFound` panel in that case (no exception overlay, no
leak). `subtree` returns `[]` for foreign roots.

## What this client does NOT use

- Nested GraphQL selections on `properties` (would fail SDL validation).
- Multi-level nested `targetEntity → relationships → targetEntity…` to fake "infinite"
  trees — true infinite-ish tree is `subtree` only.
- Tenant-wide list/search (`entities`/`search` query) — Phase 1 is UUID paste + bookmarks
  + optional `UME_EXPLORER_ROOT_IDS` env seeds.