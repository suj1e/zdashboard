/**
 * 插件数据获取:模块级缓存 + 同 key 去重 + SSE 频道失效重取。
 *
 * - 缓存命中直接返回不再请求(reload()/失效事件强制绕过);
 * - 同 key 并发请求合并为一次 in-flight promise;
 * - opts.subscribe 指定 SSE 事件名(如 plugin:<mode>:<event>),到达即清缓存重取。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSSEEvent } from './useSSE.js';

export interface UsePluginDataResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload(): void;
}

// ---------------------------------------------------------------------------
// 模块级缓存与事件总线
// ---------------------------------------------------------------------------

interface CacheEntry { data: unknown; error: string | null }

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const channelSubs = new Set<{ event: string; cb: () => void }>();

/** SSE 层收到插件频道事件时调用,触发所有匹配订阅者失效重取 */
export function notifyPluginEvent(event: string): void {
  for (const sub of [...channelSubs]) {
    if (sub.event === event) sub.cb();
  }
}

/** 测试观察 */
export function peekCache<T = unknown>(key: string): T | undefined {
  const e = cache.get(key);
  return e ? (e.data as T) : undefined;
}

/** 测试注入:清空全部缓存与订阅 */
export function __resetPluginDataForTest(): void {
  cache.clear();
  inflight.clear();
  channelSubs.clear();
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePluginData<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { subscribe?: string },
): UsePluginDataResult<T> {
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  // 真实 SSE 频道桥接到本地总线('' 表示未订阅,不挂任何监听)
  useSSEEvent(opts?.subscribe ?? '', () => notifyPluginEvent(opts?.subscribe ?? ''));

  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>(() => {
    const hit = cache.get(key);
    if (hit) return { data: hit.data as T, error: null, loading: false };
    return { data: null, error: null, loading: true };
  });

  const load = useCallback((force: boolean) => {
    if (!force) {
      const hit = cache.get(key);
      if (hit) {
        setState({ data: hit.data as T, error: null, loading: false });
        return;
      }
    } else {
      cache.delete(key);
      inflight.delete(key);
    }
    let p = inflight.get(key);
    if (!p) {
      p = Promise.resolve()
        .then(() => fetcherRef.current());
      inflight.set(key, p);
      void p.then(
        (v) => { cache.set(key, { data: v, error: null }); },
        () => { /* 错误不进缓存 */ },
      ).finally(() => {
        if (inflight.get(key) === p) inflight.delete(key);
      });
    }
    setState((s) => ({ ...s, loading: s.loading || force, error: null }));
    void p.then(
      (v) => setState({ data: v as T, error: null, loading: false }),
      // 重取失败保留旧 data(错误降级为独立字段):仅 !data && error 才是全屏错误,
      // data && error 由调用方可选轻提示——后台刷新失败不清空已有好数据
      (e) => setState((s) => ({ data: s.data, error: errorMessage(e), loading: false })),
    );
  }, [key]);

  useEffect(() => {
    load(false);
  }, [key, tick, load]);

  // SSE 失效订阅:匹配事件到达 → 绕缓存强制重取
  useEffect(() => {
    if (!opts?.subscribe) return;
    const sub = {
      event: opts.subscribe,
      cb: () => { load(true); },
    };
    channelSubs.add(sub);
    return () => { channelSubs.delete(sub); };
  }, [opts?.subscribe, load]);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
    load(true);
  }, [load]);

  return { ...state, reload };
}
