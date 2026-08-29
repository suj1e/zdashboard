import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useIcons } from '../lib/icons.js';

const STORAGE_PREFIX = 'zd-sidebar-';

// 侧栏拖拽调宽常量（design.md：clamp 220–480，默认与 globals.css --sidebar-w 同源）
const MIN_SIDEBAR_W = 220;
const MAX_SIDEBAR_W = 480;
const DEFAULT_SIDEBAR_W = 280;
const KEYBOARD_STEP = 16;
const SIDEBAR_W_KEY = 'zd-sidebar-w';

const clampWidth = (px: number) => Math.min(MAX_SIDEBAR_W, Math.max(MIN_SIDEBAR_W, px));

/** 首渲染读持久化宽度；非法（非数字/越界）忽略回退默认值，防闪烁 */
function readStoredSidebarW(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_W_KEY);
    if (raw === null) return DEFAULT_SIDEBAR_W;
    const n = Number(raw);
    return Number.isFinite(n) && n >= MIN_SIDEBAR_W && n <= MAX_SIDEBAR_W ? n : DEFAULT_SIDEBAR_W;
  } catch {
    return DEFAULT_SIDEBAR_W;
  }
}

/**
 * 侧栏框架：桌面折叠 chevron + 按 mode 记忆开合 + 折叠态热区 hover 临时展开；
 * 移动端 fixed 抽屉 + 遮罩。单实例面板，桌面/移动仅切换定位方式。
 * 无侧栏内容的插件（hasContent=false）整体动画收起——容器常驻保证宽度始终可过渡。
 * 桌面展开态右缘 6px 把手支持拖拽调宽/双击重置/键盘微调，仅作用于该实例子树。
 */
export function SidebarFrame({ mode, hasContent = true, children }: { mode: string; hasContent?: boolean; children: ReactNode }) {
  const { icon } = useIcons();
  const [open, setOpen] = useLocalStorage(`${STORAGE_PREFIX}${mode}`, true);
  const [hovered, setHovered] = useState(false);
  const [width, setWidth] = useState(readStoredSidebarW);
  const [dragging, setDragging] = useState(false);

  const widthRef = useRef(width);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const detachDragRef = useRef<() => void>(() => {});

  const toggle = () => setOpen(prev => !prev);

  /** 写 inline --sidebar-w（clamp 后）；persist=true 同步 localStorage */
  const applyWidth = (px: number, persist: boolean) => {
    const clamped = clampWidth(px);
    widthRef.current = clamped;
    setWidth(clamped);
    if (persist) {
      try {
        localStorage.setItem(SIDEBAR_W_KEY, String(clamped));
      } catch { /* storage 不可用时静默 */ }
    }
  };

  const resetWidth = () => {
    widthRef.current = DEFAULT_SIDEBAR_W;
    setWidth(DEFAULT_SIDEBAR_W);
    try {
      localStorage.removeItem(SIDEBAR_W_KEY);
    } catch { /* storage 不可用时静默 */ }
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) return;
    dragStartRef.current = { startX: e.clientX, startWidth: widthRef.current };
    setDragging(true);
    // pointer 捕获：真浏览器把后续 move/up 重定向到把手；jsdom 等环境无此实现则靠 window 监听兜底
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { /* 未激活 pointer 时忽略 */ }

    const onMove = (ev: PointerEvent) => {
      const start = dragStartRef.current;
      if (start) applyWidth(start.startWidth + (ev.clientX - start.startX), false);
    };
    const detach = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
    const onEnd = () => {
      if (!dragStartRef.current) return;
      dragStartRef.current = null;
      detach();
      setDragging(false);
      applyWidth(widthRef.current, true); // 持久化最终宽度
    };
    detachDragRef.current = detach;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  useEffect(() => () => detachDragRef.current(), []);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      applyWidth(widthRef.current - KEYBOARD_STEP, true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      applyWidth(widthRef.current + KEYBOARD_STEP, true);
    }
  };

  const show = hasContent && (open || hovered);

  return (
    <div className="relative flex-none" style={{ '--sidebar-w': `${width}px` } as CSSProperties}>
      {/* 面板：<sm 为 fixed 抽屉(show 控制 translate)；sm+ 始终 in-flow——折叠是纯宽度过渡(w-280→w-0)，
          不切换布局模式才能动画连续；仅 hover 临时展开用 absolute overlay 浮出(不推挤内容区) */}
      <div
        className={[
          'bg-background overflow-hidden',
          'fixed left-0 top-0 h-full w-[calc(var(--sidebar-w)*0.78)] max-w-[var(--sidebar-w)] z-40 shadow-lg',
          'transition-[width,transform] duration-200 ease-out',
          show ? 'translate-x-0' : '-translate-x-full',
          'sm:max-w-none sm:translate-x-0 sm:h-full sm:top-auto sm:left-auto',
          // 桌面三态（以 show 判宽度，open 区分 in-flow 与 overlay）：
          // 收起(无内容/折叠未 hover)=w-0 宽度动画；展开=in-flow；hover 临时展开=overlay 浮出
          show
            ? open
              ? 'sm:relative sm:z-auto sm:w-[var(--sidebar-w)] sm:shadow-none sm:border-r'
              : 'sm:absolute sm:z-30 sm:w-[var(--sidebar-w)] sm:shadow-lg sm:border-r'
            : 'sm:relative sm:z-auto sm:w-0 sm:shadow-none',
        ].join(' ')}
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="h-full w-[var(--sidebar-w)] overflow-auto">{children}</div>

        {/* 拖拽调宽把手：仅桌面展开态（in-flow 面板带 sm:relative 作为定位父级）；
            <sm 与折叠态不渲染。重叠处 chevron(z-40) 优先 */}
        {hasContent && open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧栏宽度"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onDoubleClick={resetWidth}
            onKeyDown={handleKeyDown}
            className={[
              'absolute right-0 top-0 z-20 hidden h-full w-1.5 cursor-col-resize select-none',
              'sm:block transition-colors',
              dragging ? 'bg-primary/20' : 'hover:bg-primary/20',
            ].join(' ')}
          />
        )}
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
        {icon('chevron-left', `h-3.5 w-3.5 transition-transform duration-200 ${open ? '' : 'rotate-180'}`)}
      </button>
      )}

      {/* 移动端关闭态重开入口（<sm 无 chevron/热区，关闭后无重开控件） */}
      {hasContent && !show && (
        <button
          onClick={toggle}
          aria-label="展开侧栏"
          className="sm:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 h-12 w-6 flex items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-border bg-background text-muted-foreground shadow"
        >
          {icon('chevron-left', 'h-3.5 w-3.5 rotate-180')}
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
