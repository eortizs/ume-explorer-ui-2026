import type { SubtreeNode, TreeNode } from './types';

export function treeFromSubtree(
  rows: SubtreeNode[],
  options: { rootId?: string; edgeRole?: string } = {},
): TreeNode[] {
  if (rows.length === 0) return [];

  const nodes = new Map<string, TreeNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      properties: {},
      children: [],
      edgeRole: row.depth > 0 ? options.edgeRole : undefined,
    });
  }

  let roots: TreeNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId === null || row.parentId === row.id) {
      roots.push(node);
      continue;
    }
    const parent = nodes.get(row.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.children.push(node);
  }

  if (options.rootId) {
    const focus = nodes.get(options.rootId);
    if (focus) roots = [focus];
  }

  return roots;
}