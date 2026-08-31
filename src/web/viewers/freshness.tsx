/**
 * viewer 数据新鲜度基建(数据新鲜度 change):
 * - useViewerFreshness:订阅 SSE files 事件(300ms 防抖,批量保存合并为一次)返回失效版本号 + 手动刷新;
 *   服务端 files payload 恒空串,viewer 挂载即只对应当前资产——重取当前 path 即「命中当前资产才失效」;
 *   断线重连补偿(useSSE eventSubs)派发的空 payload 走同一订阅。
 * - RefreshButton:各 viewer 工具栏统一的手动刷新按钮。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSSEEvent } from '../hooks/useSSE.js';
import { useIcons } from '../lib/icons.js';

export const FILES_REFRESH_DEBOUNCE_MS = 300;

/** files 事件到达 → 300ms 防抖后触发一次 onInvalidate */
function useFilesInvalidate(onInvalidate: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(onInvalidate);
  useEffect(() => { cb.current = onInvalidate; });

  useSSEEvent('files', () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; cb.current(); }, FILES_REFRESH_DEBOUNCE_MS);
  });
  // 卸载清防抖计时器,避免泄漏后误触发
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
}

/** 受控失效信号:[版本号, refresh];版本号进 effect deps 触发重取,refresh 供刷新按钮/ErrorState onRetry */
export function useViewerFreshness(): [number, () => void] {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useFilesInvalidate(refresh);
  return [version, refresh];
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  const { icon } = useIcons();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="刷新"
      title="刷新"
      className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-md)] border border-border bg-background/80 text-sm hover:bg-muted transition-colors"
    >
      {icon('refresh-cw', 'h-3.5 w-3.5')}
      <span>刷新</span>
    </button>
  );
}
