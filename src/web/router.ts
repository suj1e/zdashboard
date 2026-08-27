/**
 * URL 路由(searchParams):/?p=<mode>&<plugin params>
 *
 * - useRoute 订阅 history,popstate 同步;p 缺省为 null(首页)。
 * - navigate 合并 patch(null 删键),默认 pushState,opts.replace 走 replaceState。
 * - 兼容:首次进入旧深链接 #<mode> 重定向为 ?p=<mode>(#home 仅清 hash)。
 */
import { useSyncExternalStore } from 'react';

const ROUTE_KEY = 'p';
const LEGACY_HOME_HASH = 'home';

export interface RouteState {
  /** 当前插件 mode;'p' 缺省时为 null(首页)。合法性由调用方(注册表)校验 */
  plugin: string | null;
  /** 全量 URL 参数(含 p),消费方按需读取 */
  params: URLSearchParams;
  navigate(patch: Record<string, string | null>, opts?: { replace?: boolean }): void;
}

// ---------------------------------------------------------------------------
// patch 纯函数(可独立测试):基于 search 字符串合并键,null 删键
// ---------------------------------------------------------------------------

export function applyPatch(currentSearch: string, patch: Record<string, string | null>): string {
  const sp = new URLSearchParams(currentSearch);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) sp.delete(key);
    else sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function canonicalQuery(search: string): string {
  return new URLSearchParams(search).toString();
}

// ---------------------------------------------------------------------------
// 订阅与快照
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
let popstateBound = false;

function notifyAll(): void {
  for (const cb of [...listeners]) cb();
}

function subscribe(cb: () => void): () => void {
  bindPopstate();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function bindPopstate(): void {
  if (popstateBound || typeof window === 'undefined') return;
  popstateBound = true;
  window.addEventListener('popstate', notifyAll);
}

function getSnapshot(): string {
  redirectLegacyHash();
  return window.location.search;
}

function getServerSnapshot(): string {
  return '';
}

// ---------------------------------------------------------------------------
// 旧深链接重定向(#<mode> → ?p=<mode>),进程内只执行一次
// ---------------------------------------------------------------------------

let redirectDone = false;

export function redirectLegacyHash(): void {
  if (redirectDone || typeof window === 'undefined') return;
  redirectDone = true;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const sp = new URLSearchParams(window.location.search);
  if (!sp.has(ROUTE_KEY)) {
    if (hash !== LEGACY_HOME_HASH) sp.set(ROUTE_KEY, hash);
    const qs = sp.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }
}

/** 测试注入:重置单次重定向守卫 */
export function __resetRouterForTest(): void {
  redirectDone = false;
}

// ---------------------------------------------------------------------------
// useRoute
// ---------------------------------------------------------------------------

export function useRoute(): RouteState {
  redirectLegacyHash();
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const params = new URLSearchParams(window.location.search);
  const navigate = (
    patch: Record<string, string | null>,
    opts?: { replace?: boolean },
  ): void => {
    const target = applyPatch(window.location.search, patch);
    if (canonicalQuery(target) === canonicalQuery(window.location.search)) return;
    const url = window.location.pathname + target;
    if (opts?.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    notifyAll();
  };

  return {
    plugin: params.get(ROUTE_KEY),
    params,
    navigate,
  };
}
