import type { ReactNode } from 'react';

/** 工具条:搜索/筛选/批量动作的水平排布容器 */
export function Toolbar({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 flex-wrap rounded-[var(--radius-md)] border border-border bg-background px-2.5 py-1.5 mb-3 ${className ?? ''}`}
      data-slot="toolbar"
    >
      {children}
    </div>
  );
}
