import { type ReactNode, useState } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { ChevronLeft } from 'lucide-react';

const STORAGE_PREFIX = 'zd-sidebar-';

/**
 * 侧栏框架：桌面折叠 chevron + 按 mode 记忆开合 + 折叠态热区 hover 临时展开；
 * 移动端 fixed 抽屉 + 遮罩。单实例面板，桌面/移动仅切换定位方式。
 * 无侧栏内容的插件（hasContent=false）整体动画收起——容器常驻保证宽度始终可过渡。
 */
export function SidebarFrame({ mode, hasContent = true, children, className }: { mode: string; hasContent?: boolean; children: ReactNode; className?: string }) {
  const [open, setOpen] = useLocalStorage(`${STORAGE_PREFIX}${mode}`, true);
  const [hovered, setHovered] = useState(false);

  const toggle = () => setOpen(prev => !prev);

  const show = hasContent && (open || hovered);

  return (
    <div className={`relative flex-none ${className ?? ''}`}>
      {/* 面板：<sm 为 fixed 抽屉(show 控制 translate)；sm+ 始终 in-flow——折叠是纯宽度过渡(w-280→w-0)，
          不切换布局模式才能动画连续；仅 hover 临时展开用 absolute overlay 浮出(不推挤内容区) */}
      <div
        className={[
          'bg-background overflow-hidden',
          'fixed left-0 top-0 h-full w-[78%] max-w-[280px] z-40 shadow-lg',
          'transition-[width,transform] duration-200 ease-out',
          show ? 'translate-x-0' : '-translate-x-full',
          'sm:max-w-none sm:translate-x-0 sm:h-full sm:top-auto sm:left-auto',
          // 桌面三态（以 show 判宽度，open 区分 in-flow 与 overlay）：
          // 收起(无内容/折叠未 hover)=w-0 宽度动画；展开=in-flow；hover 临时展开=overlay 浮出
          show
            ? open
              ? 'sm:relative sm:z-auto sm:w-[280px] sm:shadow-none sm:border-r'
              : 'sm:absolute sm:z-30 sm:w-[280px] sm:shadow-lg sm:border-r'
            : 'sm:relative sm:z-auto sm:w-0 sm:shadow-none',
        ].join(' ')}
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="h-full w-[280px] overflow-auto">{children}</div>
      </div>

      {/* 移动端遮罩 */}
      <div
        className={`sm:hidden fixed inset-0 z-30 bg-black/40 transition-opacity ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={toggle}
        aria-hidden="true"
      />

      {/* 折叠 chevron（桌面，仅在有侧栏内容的插件显示） */}
      {hasContent && (
      <button
        onClick={toggle}
        aria-expanded={open}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-40
          h-10 w-5 items-center justify-center
          rounded-l-[var(--radius-md)] border border-r-0 border-border bg-background
          text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={open ? '折叠侧栏' : '展开侧栏'}
      >
        <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
      </button>
      )}

      {/* 移动端关闭态重开入口（<sm 无 chevron/热区，关闭后无重开控件） */}
      {hasContent && !show && (
        <button
          onClick={toggle}
          aria-label="展开侧栏"
          className="sm:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 h-12 w-6 flex items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-border bg-background text-muted-foreground shadow"
        >
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}

      {/* 折叠态热区（桌面）：hover 临时展开，移开收回 */}
      {hasContent && !open && (
        <div
          className="hidden sm:block absolute left-0 top-0 h-full w-1.5 z-10"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      )}
    </div>
  );
}
