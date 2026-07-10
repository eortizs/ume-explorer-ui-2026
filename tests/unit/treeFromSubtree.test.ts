import { describe, expect, it } from 'vitest';
import { treeFromSubtree } from '@/lib/treeFromSubtree';
import type { SubtreeNode } from '@/lib/types';

function row(id: string, depth: number, parentId: string | null, name = id): SubtreeNode {
  return { id, depth, parentId, name, type: 'physical_asset' };
}

describe('treeFromSubtree', () => {
  it('builds a 3-level tree from flat subtree rows', () => {
    const rows: SubtreeNode[] = [
      row('a', 0, null, 'root'),
      row('b', 1, 'a', 'child-1'),
      row('c', 1, 'a', 'child-2'),
      row('d', 2, 'b', 'grand-1'),
    ];
    const trees = treeFromSubtree(rows, { rootId: 'a' });
    expect(trees).toHaveLength(1);
    expect(trees[0]!.id).toBe('a');
    expect(trees[0]!.children.map((c) => c.id).sort()).toEqual(['b', 'c']);
    expect(trees[0]!.children[0]!.children.map((c) => c.id)).toEqual(['d']);
  });

  it('returns multiple roots when no rootId is supplied', () => {
    const rows: SubtreeNode[] = [
      row('a', 0, null, 'A'),
      row('a1', 1, 'a'),
      row('b', 0, null, 'B'),
    ];
    const trees = treeFromSubtree(rows);
    expect(trees.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('returns [] for empty input', () => {
    expect(treeFromSubtree([])).toEqual([]);
  });

  it('handles rows whose parent is missing by promoting them to roots', () => {
    const rows: SubtreeNode[] = [
      row('a', 0, null),
      row('orphan', 1, 'missing-parent'),
    ];
    const trees = treeFromSubtree(rows);
    expect(trees.map((t) => t.id).sort()).toEqual(['a', 'orphan']);
  });

  it('filters to focus on rootId even if provided alongside siblings', () => {
    const rows: SubtreeNode[] = [
      row('a', 0, null, 'A'),
      row('b', 0, null, 'B'),
      row('a1', 1, 'a'),
    ];
    const trees = treeFromSubtree(rows, { rootId: 'a' });
    expect(trees).toHaveLength(1);
    expect(trees[0]!.id).toBe('a');
    expect(trees[0]!.children[0]!.id).toBe('a1');
  });
});