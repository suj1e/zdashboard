import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

// 键盘微调步长（SidebarFrame 侧栏把手既有约定，抽取后两处共用）
const KEYBOARD_STEP = 16;
// 拖拽松手后浏览器补发 click，紧接的第二下点击会合成 dblclick——该窗口内的重置视为误触
const DOUBLE_CLICK_GUARD_MS = 500;

const clampRange = (px: number, min: number, max: number) => Math.min(max, Math.max(min, px));

interface ResizeHandleProps {
  /** 分隔线方向：vertical=竖条左右拖（ArrowLeft/Right 调值）；horizontal=横条上下拖（ArrowUp/Down） */
  orientation: 'horizontal' | 'vertical';
  min: number;
  max: number;
  /** 受控当前值（px） */
  value: number;
  /** 值变化：拖拽中 persist=false（父级不写盘），拖拽收尾/键盘 persist=true（父级持久化） */
  onChange: (px: number, persist: boolean) => void;
  /** 双击重置到默认值；持久化的清除由调用方在 onReset 内完成 */
  onReset: () => void;
  /** 读屏器标签（aria-label） */
  label: string;
  /** 定位/显隐/尺寸类（如 absolute right-0 hidden sm:block），与内置交互类合并 */
  className?: string;
  /** 拖拽态上抛（父级常用于关闭宽度过渡动画） */
  onDraggingChange?: (dragging: boolean) => void;
}

/**
 * 可访问的拖拽调值把手（role=separator + 完整 aria 值语义含 valuetext）：
 * 拖拽调值（clamp min–max）+ 双击重置 + ArrowKey 微调 + 拖拽尾随误触守卫。
 * pointer 捕获：真浏览器把后续 move/up 重定向到把手；jsdom 等环境靠 window 监听兜底。
 * 参数化抽取自 SidebarFrame 侧栏把手（2026-08-31-view-outline-ux），OutlineNav 复用。
 */
export function ResizeHandle({ orientation, min, max, value, onChange, onReset, label, className, onDraggingChange }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);

  // 拖拽闭包须读到最新 value/onChange/onReset：ref 每渲染同步，避免 stale closure
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const resetRef = useRef(onReset);
  resetRef.current = onReset;

  const dragStartRef = useRef<{ start: number; startValue: number } | null>(null);
  const detachDragRef = useRef<() => void>(() => {});
  const lastMovedDragEndRef = useRef<number | null>(null);

  const axisOf = (e: { clientX: number; clientY: number }) => (orientation === 'vertical' ? e.clientX : e.clientY);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) return;
    dragStartRef.current = { start: axisOf(e), startValue: valueRef.current };
    setDragging(true);
    onDraggingChange?.(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { /* 未激活 pointer 时忽略 */ }

    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const current = axisOf(ev);
      if (current !== start.start) moved = true;
      changeRef.current(clampRange(start.startValue + (current - start.start), min, max), false);
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
      onDraggingChange?.(false);
      if (moved) lastMovedDragEndRef.current = Date.now();
      changeRef.current(valueRef.current, true); // 持久化最终值
    };
    detachDragRef.current = detach;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  useEffect(() => () => detachDragRef.current(), []);

  const handleDoubleClick = () => {
    // 仅记录"有位移"的拖拽收尾：纯双击（两次无位移点击）仍是合法重置入口
    const lastMovedAt = lastMovedDragEndRef.current;
    if (lastMovedAt !== null && Date.now() - lastMovedAt < DOUBLE_CLICK_GUARD_MS) return;
    resetRef.current();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const dec = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp';
    const inc = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown';
    if (e.key === dec) {
      e.preventDefault();
      changeRef.current(clampRange(valueRef.current - KEYBOARD_STEP, min, max), true);
    } else if (e.key === inc) {
      e.preventDefault();
      changeRef.current(clampRange(valueRef.current + KEYBOARD_STEP, min, max), true);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value}px`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={[
        'select-none touch-none',
        dragging ? 'bg-primary/20' : 'hover:bg-primary/20',
        dragging ? 'transition-none' : 'transition-colors',
        className,
      ].join(' ')}
    />
  );
}
