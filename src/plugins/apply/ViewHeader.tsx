/**
 * apply 局部 ViewHeader:SingleChangeView/BatchView 两 Tab 内容区统一顶部条。
 * 契约(design.md「顶部统一」):同 px/py、同标题层级(单一 h3,低于壳 PageHeader 的 h2)、
 * 右侧操作槽位恒在;Workspace 壳面包屑逻辑不动。局部组件,不进平台 kit。
 */
import type { ReactNode } from 'react';

export function ViewHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div data-testid="view-header" className="flex-none flex items-center gap-2 px-4 py-2 border-b border-border">
      <h3 className="text-sm font-semibold text-foreground truncate min-w-0">{title}</h3>
      <div data-testid="view-header-actions" className="ml-auto flex items-center gap-1.5 flex-none min-w-0">
        {actions ?? null}
      </div>
    </div>
  );
}
