import { type ReactNode, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'zd-sidebar-';

function useSidebarState(mode: string, defaultOpen = true) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${mode}`);
      if (raw === '1') return true;
      if (raw === '0') return false;
    } catch { /* ignore */ }
    return defaultOpen;
  });
  const prevMode = useRef(mode);

  useEffect(() => {
    if (prevMode.current !== mode) {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${mode}`);
        if (raw === '1') setOpen(true);
        else if (raw === '0') setOpen(false);
        else setOpen(defaultOpen);
      } catch { setOpen(defaultOpen); }
      prevMode.current = mode;
    }
  }, [mode, defaultOpen]);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      try { localStorage.setItem(`${STORAGE_PREFIX}${mode}`, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  return [open, toggle] as const;
}

/**
 * 侧栏框架：桌面折叠 chevron + 按 mode 记忆开合 + 折叠态热区 hover 临时展开；
 * 移动端 fixed 抽屉 + 遮罩。单实例面板，桌面/移动仅切换定位方式。
 */
export function SidebarFrame({ mode, children, className }: { mode: string; children: ReactNode; className?: string }) {
  const [open, toggle] = useSidebarState(mode, true);
  const [hovered, setHovered] = useState(false);

  const show = open || hovered; // hover 临时展开只影响视觉，不写 localStorage

  return (
    <div className={`relative flex-none ${className ?? ''}`}>
      {/* 面板：<sm 为 fixed 抽屉(open 控制 translate)；sm+ 为 in-flow(show 控制宽度，折叠/临时展开时 overlay 浮出) */}
      <div
        className={[
          'bg-background border-r overflow-hidden transition-[width,transform] duration-200',
          'fixed left-0 top-0 h-full w-[78%] max-w-[280px] z-40 shadow-lg',
          open ? 'translate-x-0' : '-translate-x-full',
          show ? 'sm:w-[280px]' : 'sm:w-0',
          'sm:max-w-none sm:translate-x-0',
          open ? 'sm:relative sm:z-auto sm:shadow-none' : 'sm:absolute sm:top-0 sm:left-0 sm:h-full sm:z-30 sm:shadow-lg',
        ].join(' ')}
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="h-full w-[280px] overflow-auto">{children}</div>
      </div>

      {/* 移动端遮罩 */}
      <div
        className={`sm:hidden fixed inset-0 z-30 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={toggle}
        aria-hidden="true"
      />

      {/* 折叠 chevron（桌面） */}
      <button
        onClick={toggle}
        aria-expanded={open}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-40
          h-10 w-5 items-center justify-center
          rounded-l-md border border-r-0 border-border bg-background
          text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={open ? '折叠侧栏' : '展开侧栏'}
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* 折叠态热区（桌面）：hover 临时展开，移开收回 */}
      {!open && (
        <div
          className="hidden sm:block absolute left-0 top-0 h-full w-1.5 z-10"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      )}
    </div>
  );
}
