import { useEffect, useRef, useState } from 'react';

export type ConnStatus = 'connecting' | 'live' | 'lost';

type Handlers = { onReload: () => void; onFiles: () => void; onStatus: (s: ConnStatus) => void };

/** 模块级 SSE 单例:整页只开一条 /__reload 连接,所有 useSSE 订阅者共享(避免多 EventSource 占满浏览器同域连接池) */
const listeners = new Set<Handlers>();
let es: EventSource | null = null;
let status: ConnStatus = 'connecting';
const statusSubs = new Set<(s: ConnStatus) => void>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function setStatus(s: ConnStatus) {
  status = s;
  statusSubs.forEach((fn) => fn(s));
}

function connect() {
  if (es) return;
  setStatus(status === 'lost' ? 'connecting' : status);
  const conn = new EventSource('/__reload');
  es = conn;
  conn.onopen = () => setStatus('live');
  conn.addEventListener('reload', () => listeners.forEach((h) => h.onReload()));
  conn.addEventListener('files', () => listeners.forEach((h) => h.onFiles()));
  conn.onerror = () => {
    conn.close();
    es = null;
    setStatus('lost');
    // 停服场景下不无限重连:dashboard 停止按钮触发前 stopped 标记由 useSSE 消费方控制,此处统一轻量重试
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, 1500);
  };
}

function ensure() {
  if (typeof window !== 'undefined' && listeners.size > 0 && !es) connect();
}

export function useSSE(onReload: () => void, onFiles: () => void, _stoppedRef?: React.MutableRefObject<boolean>) {
  const [connStatus, setConnStatus] = useState<ConnStatus>(status);
  const onReloadRef = useRef(onReload);
  const onFilesRef = useRef(onFiles);

  useEffect(() => { onReloadRef.current = onReload; });
  useEffect(() => { onFilesRef.current = onFiles; });

  useEffect(() => {
    const handlers: Handlers = {
      onReload: () => onReloadRef.current(),
      onFiles: () => onFilesRef.current(),
      onStatus: setConnStatus,
    };
    listeners.add(handlers);
    statusSubs.add(setConnStatus);
    setConnStatus(status);
    ensure();
    return () => {
      listeners.delete(handlers);
      statusSubs.delete(setConnStatus);
      if (listeners.size === 0 && retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    };
  }, []);

  return connStatus;
}
