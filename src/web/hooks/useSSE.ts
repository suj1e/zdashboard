import { useEffect, useRef, useState } from 'react';

export type ConnStatus = 'connecting' | 'live' | 'lost';

type Handlers = { onReload: () => void; onFiles: () => void; onStatus: (s: ConnStatus) => void; onConfig?: (plugin: string) => void };

/** 模块级 SSE 单例:整页只开一条 /__reload 连接,所有 useSSE 订阅者共享(避免多 EventSource 占满浏览器同域连接池) */
const listeners = new Set<Handlers>();
let es: EventSource | null = null;
let status: ConnStatus = 'connecting';
const statusSubs = new Set<(s: ConnStatus) => void>();
/** useSSEEvent 频道注册表:event → 补偿函数集合。断线重连后逐频道补发失效信号(数据新鲜度) */
const eventSubs = new Map<string, Set<() => void>>();

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
    // 先取进入 live 前的状态再翻转,否则断线恢复分支恒不可达
    const wasLost = status === 'lost';
    setStatus('live');
    // 断线重连后静默刷新各 plugin 数据,不弹窗、不整页 reload
    if (wasLost) {
      listeners.forEach((h) => h.onFiles());
      // 重连补偿:断线期间漏掉的具名频道事件逐个补发空 payload,
      // 订阅方(usePluginData/viewer)把任意事件(含 '')视为失效重取
      eventSubs.forEach((subs) => subs.forEach((fn) => fn()));
    }
  };
  conn.addEventListener('reload', () => listeners.forEach((h) => h.onReload()));
  conn.addEventListener('files', () => listeners.forEach((h) => h.onFiles()));
  conn.addEventListener('config', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data || '{}');
      if (data?.plugin) listeners.forEach((h) => h.onConfig?.(data.plugin));
    } catch { /* ignore */ }
  });
  conn.onerror = () => {
    // 不关闭连接,让 EventSource 原生重连机制生效
    setStatus('lost');
  };
}

function ensure() {
  if (typeof window !== 'undefined' && listeners.size > 0 && !es) connect();
}

export function useSSE(onReload: () => void, onFiles: () => void, _stoppedRef?: React.MutableRefObject<boolean>, onConfig?: (plugin: string) => void) {
  const [connStatus, setConnStatus] = useState<ConnStatus>(status);
  const onReloadRef = useRef(onReload);
  const onFilesRef = useRef(onFiles);
  const onConfigRef = useRef(onConfig);

  useEffect(() => { onReloadRef.current = onReload; });
  useEffect(() => { onFilesRef.current = onFiles; });
  useEffect(() => { onConfigRef.current = onConfig; });

  useEffect(() => {
    const handlers: Handlers = {
      onReload: () => onReloadRef.current(),
      onFiles: () => onFilesRef.current(),
      onStatus: setConnStatus,
      onConfig: (plugin: string) => onConfigRef.current?.(plugin),
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

/**
 * 订阅任意具名 SSE 事件(如插件频道 plugin:<mode>:<event>),复用共享 /__reload 连接。
 * 与 useSSE 主订阅解耦:动态频道随 hook 生命周期挂/摘。
 */
export function useSSEEvent(event: string, handler: (data: string) => void) {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });

  useEffect(() => {
    if (!event || typeof globalThis.EventSource === 'undefined') return;
    if (!es) connect();
    const conn = es;
    if (!conn) return;
    const fn = (e: MessageEvent) => ref.current(e.data);
    const compensate = () => ref.current('');
    conn.addEventListener(event, fn as EventListener);
    // 注册进补偿表:断线重连后被逐频道补发(空 payload 视为失效重取)
    if (!eventSubs.has(event)) eventSubs.set(event, new Set());
    eventSubs.get(event)!.add(compensate);
    return () => {
      conn.removeEventListener(event, fn as EventListener);
      const subs = eventSubs.get(event);
      subs?.delete(compensate);
      if (subs && subs.size === 0) eventSubs.delete(event);
    };
  }, [event]);
}
