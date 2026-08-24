import { useEffect, useRef, useState } from 'react';

export type ConnStatus = 'connecting' | 'live' | 'lost';

type Handlers = { onReload: () => void; onFiles: () => void; onStatus: (s: ConnStatus) => void };

/** 模块级 SSE 单例:整页只开一条 /__reload 连接,所有 useSSE 订阅者共享(避免多 EventSource 占满浏览器同域连接池) */
const listeners = new Set<Handlers>();
let es: EventSource | null = null;
let status: ConnStatus = 'connecting';
const statusSubs = new Set<(s: ConnStatus) => void>();

function setStatus(s: ConnStatus) {
  status = s;
  statusSubs.forEach((fn) => fn(s));
}

function connect() {
  if (es) return;
  setStatus('connecting');
  const conn = new EventSource('/__reload');
  es = conn;
  conn.onopen = () => {
    setStatus('live');
    // 断线重连后静默刷新各 plugin 数据,不弹窗、不整页 reload
    if (status === 'lost') {
      listeners.forEach((h) => h.onFiles());
    }
  };
  conn.addEventListener('reload', () => listeners.forEach((h) => h.onReload()));
  conn.addEventListener('files', () => listeners.forEach((h) => h.onFiles()));
  conn.onerror = () => {
    // 不关闭连接,让 EventSource 原生重连机制生效
    setStatus('lost');
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
      if (listeners.size === 0 && es) {
        es.close();
        es = null;
      }
    };
  }, []);

  return connStatus;
}
