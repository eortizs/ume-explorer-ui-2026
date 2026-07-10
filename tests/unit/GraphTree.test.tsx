import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphTree } from '@/components/GraphTree';
import type { TreeNode } from '@/lib/types';

function mkNode(
  id: string,
  name: string,
  type: string,
  children: TreeNode[] = [],
  props: Record<string, unknown> = {},
): TreeNode {
  return { id, name, type, properties: props, children };
}

const tinaTree: TreeNode = mkNode('hotel', 'Hotel Sol', 'physical_asset', [
  mkNode('room', 'Habitación 320', 'physical_asset', [
    mkNode('bath', 'Baño', 'physical_asset', [
      mkNode('tina', 'Tina 501', 'physical_asset', [
        mkNode('part', 'Sello Mecánico', 'physical_asset'),
      ]),
    ]),
  ]),
]);

describe('GraphTree', () => {
  it('renders all 5 levels of the Tina fixture', () => {
    render(<GraphTree node={tinaTree} />);
    expect(screen.getByText('Hotel Sol')).toBeInTheDocument();
    expect(screen.getByText('Habitación 320')).toBeInTheDocument();
    expect(screen.getByText('Baño')).toBeInTheDocument();
    expect(screen.getByText('Tina 501')).toBeInTheDocument();
    expect(screen.getByText('Sello Mecánico')).toBeInTheDocument();
  });

  it('renders 5 nodes in document order (parent before descendant)', () => {
    const { container } = render(<GraphTree node={tinaTree} />);
    const ids = ['hotel', 'room', 'bath', 'tina', 'part'];
    const rows = ids.map((id) =>
      container.querySelector(`[data-testid="graph-node-${id}"]`),
    );
    for (const node of rows) expect(node).not.toBeNull();

    const body = container.textContent ?? '';
    const positions = ids.map((id) => body.indexOf(id === 'hotel' ? 'Hotel Sol'
      : id === 'room' ? 'Habitación 320'
      : id === 'bath' ? 'Baño'
      : id === 'tina' ? 'Tina 501'
      : 'Sello Mecánico'));
    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]!).toBeLessThan(positions[i + 1]!);
    }
  });

  it('shows asset_class badge when present in properties', () => {
    const tree = mkNode('x', 'X', 'physical_asset', [], { asset_class: 'pump' });
    render(<GraphTree node={tree} />);
    expect(screen.getByText('pump')).toBeInTheDocument();
  });

  it('falls back to type when asset_class is missing', () => {
    const tree = mkNode('x', 'X', 'pos_ticket');
    render(<GraphTree node={tree} />);
    expect(screen.getByText('pos_ticket')).toBeInTheDocument();
  });
});