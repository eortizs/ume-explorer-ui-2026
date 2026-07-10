export const ENTITY_QUERY = /* GraphQL */ `
  query GetEntityExplorer($id: ID!) {
    entity(id: $id) {
      id
      name
      type
      tenant
      markdown
      properties
      lifecycle {
        state
        createdAt
        updatedAt
        createdBy
      }
      children: relationships(role: "contains_component", direction: "outgoing") {
        targetId
        targetType
        role
        direction
        properties
        targetEntity {
          id
          name
          type
          properties
        }
      }
      containedBy: relationships(role: "contains_component", direction: "incoming") {
        targetId
        targetType
        role
        direction
        targetEntity {
          id
          name
          type
        }
      }
      journals: relationships(role: "journal_of", direction: "incoming") {
        targetId
        targetEntity {
          id
          name
          type
          markdown
          properties
          lifecycle {
            state
            createdAt
            updatedAt
            createdBy
          }
        }
      }
    }
  }
`;

export const SUBTREE_QUERY = /* GraphQL */ `
  query GetSubtree($rootId: ID!, $maxDepth: Int, $role: String) {
    subtree(rootId: $rootId, maxDepth: $maxDepth, role: $role) {
      id
      type
      name
      depth
      parentId
    }
  }
`;