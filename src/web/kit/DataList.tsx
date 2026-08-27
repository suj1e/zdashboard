import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState.js';

/** 数据行列表:空列表回退 EmptyState 行为 */
export function DataList<T>({ items, renderItem, emptyText = '暂无数据', keyOf }: {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  emptyText?: string;
  keyOf?: (item: T, index: number) => string;
}) {
  if (items.length === 0) return <EmptyState title={emptyText} />;
  return (
    <ul className="divide-y divide-border" data-slot="data-list">
      {items.map((item, i) => (
        <li key={keyOf ? keyOf(item, i) : i} className="py-2 first:pt-0 last:pb-0">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
