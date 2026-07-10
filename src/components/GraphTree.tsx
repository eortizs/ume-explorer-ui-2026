'use client';

import type { TreeNode } from '@/lib/types';

export const HARD_MAX_DEPTH = 32;

export interface GraphTreeProps {
  node: TreeNode;
  currentDepth?: number;
  onSelect?: (id: string) => void;
}

interface EdgeProps {
  label: string;
}

function EdgeLabel({ label }: EdgeProps) {
  return (
    <div className="ml-8 my-1">
      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        ➔ {label}
      </span>
    </div>
  );
}

function assetClass(props: Record<string, unknown>, type: string): string {
  const cls = props.asset_class;
  return typeof cls === 'string' && cls.length > 0 ? cls : type;
}

export function GraphTree({ node, currentDepth = 0, onSelect }: GraphTreeProps) {
  if (currentDepth > HARD_MAX_DEPTH) return null;

  const props = node.properties ?? {};
  const containerClass =
    currentDepth === 0
      ? 'my-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm'
      : 'ml-6 my-2 border-l-2 border-slate-200 pl-4';

  return (
    <div className={containerClass}>
      <div
        className={
          onSelect
            ? 'flex cursor-pointer items-center space-x-3 rounded p-1 transition-all hover:border-indigo-300'
            : 'flex items-center space-x-3 p-2'
        }
        onClick={onSelect ? () => onSelect(node.id) : undefined}
        role={onSelect ? 'button' : undefined}
        data-testid={`graph-node-${node.id}`}
      >
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs uppercase text-slate-600">
          {assetClass(props, node.type)}
        </span>
        <span className="text-sm font-medium text-slate-800">{node.name}</span>
        <span className="font-mono text-xs text-slate-400">({node.id.slice(0, 8)})</span>
      </div>

      {node.children.length > 0 && (
        <div className="mt-2 space-y-1">
          {node.children.map((child) => (
            <div key={child.id}>
              <EdgeLabel label={child.edgeRole ?? 'contains_component'} />
              <GraphTree node={child} currentDepth={currentDepth + 1} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}