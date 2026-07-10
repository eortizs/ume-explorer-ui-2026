/**
 * Default containment role used by the explorer subtree view.
 * Mirrors the primary composition role of each type in ume-standard fixtures.
 * Falls back to `contains_component` for structural assets.
 */
export function defaultSubtreeRole(entityType: string | undefined | null): string {
  switch (entityType) {
    case 'pos_ticket':
      return 'contains_line';
    case 'shopping_list':
      return 'contains';
    case 'travel_itinerary':
      return 'has_day';
    case 'travel_day':
      return 'has_activity';
    case 'erp_project':
    case 'physical_asset':
    default:
      return 'contains_component';
  }
}
