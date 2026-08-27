/**
 * 宿主 ↔ 外部插件(iframe)postMessage 桥。
 *
 * 协议约定:
 * - 所有消息带 `source: 'zdashboard'` 字段防与其他 postMessage 串扰;
 * - 方向:iframe→宿主(zd:ready / zd:navigate / zd:fetch),宿主→iframe(zd:init / zd:theme /
 *   zd:navigate / zd:fetch:result / zd:config);错方向、错来源、未知 type 一律静默丢弃;
 *   zd:config 为宿主→iframe 单向(实施期协议收窄,修订理由见 design.md「协议修订记录」:
 *   iframe→宿主「写」方向无授权机制,外部插件不可获得写权限);
 * - zd:fetch 由宿主同源代理(白名单默认放行 /__ 前缀,其余拒绝回 403),代理请求
 *   剥离 x-stop-token —— 外部插件不可获得写权限;
 * - zd:fetch 以自增 id 配对请求与响应。
 */

/** 协议消息统一 source 标识 */
export const BRIDGE_SOURCE = 'zdashboard';
/** zd:fetch 代理白名单前缀:默认放行服务端 API(/__*) */
export const FETCH_PATH_PREFIX = '/__';
/** 白名单拒绝状态码 */
export const FORBIDDEN_STATUS = 403;
/** 代理请求自身失败(网络层)时回传的状态码 */
export const PROXY_FAILURE_STATUS = 502;

/** iframe→宿主可携带的 fetch init(仅结构化克隆安全的纯数据字段) */
export interface BridgeFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HostSnapshot {
  theme: string;
  mode: string;
  params: Record<string, string>;
  config: Record<string, unknown>;
}

/** 协议消息判别联合(toHost = 由 iframe 发出,toPlugin = 由宿主发出) */
export type BridgeMessage =
  | { source: typeof BRIDGE_SOURCE; type: 'zd:ready' }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:init'; theme: string; mode: string; params: Record<string, string>; config: Record<string, unknown> }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:theme'; theme: string; mode: string }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:navigate'; params: Record<string, string> }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:fetch'; id: string; path: string; init?: BridgeFetchInit }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:fetch:result'; id: string; status: number; body: unknown }
  | { source: typeof BRIDGE_SOURCE; type: 'zd:config'; plugin: string; config: Record<string, unknown> };

type BridgeDirection = 'toHost' | 'toPlugin';

const HOST_ACCEPTED = new Set(['zd:ready', 'zd:navigate', 'zd:fetch']);
const PLUGIN_ACCEPTED = new Set(['zd:init', 'zd:theme', 'zd:navigate', 'zd:fetch:result', 'zd:config']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!isRecord(v)) return false;
  return Object.values(v).every((x) => typeof x === 'string');
}

function isFetchInit(v: unknown): v is BridgeFetchInit {
  if (v === undefined) return true;
  if (!isRecord(v)) return false;
  if (v.method !== undefined && typeof v.method !== 'string') return false;
  if (v.body !== undefined && typeof v.body !== 'string') return false;
  if (v.headers !== undefined && !isStringRecord(v.headers)) return false;
  return true;
}

/**
 * 解析并校验一条桥消息;不满足协议(source 缺失/未知 type/方向不符/载荷非法)返回 null。
 * 纯函数,宿主/插件两侧共用。
 */
export function parseBridgeMessage(data: unknown, direction: BridgeDirection): BridgeMessage | null {
  if (!isRecord(data) || data.source !== BRIDGE_SOURCE || typeof data.type !== 'string') return null;
  const accepted = direction === 'toHost' ? HOST_ACCEPTED : PLUGIN_ACCEPTED;
  if (!accepted.has(data.type)) return null;

  const m = data as unknown as BridgeMessage;
  switch (m.type) {
    case 'zd:ready':
      return m;
    case 'zd:init':
    case 'zd:theme':
      return typeof m.theme === 'string' && typeof m.mode === 'string' ? m : null;
    case 'zd:navigate':
      return isStringRecord(m.params) ? m : null;
    case 'zd:fetch':
      return typeof m.id === 'string' && typeof m.path === 'string' && isFetchInit(m.init) ? m : null;
    case 'zd:fetch:result':
      return typeof m.id === 'string' && typeof m.status === 'number' ? m : null;
    case 'zd:config':
      return typeof m.plugin === 'string' && isRecord(m.config) ? m : null;
  }
}

/** 白名单路径解析基准:固定假源;绝对 URL/协议相对 URL 因 origin 不符被拒(与全局 location 解耦,函数保持纯) */
const FETCH_PATH_BASE = 'http://zd.invalid';

/**
 * zd:fetch 白名单:仅放行规范化后落在 /__ 前缀下的同源相对路径。
 * 必须先经 WHATWG URL 解析再判定(与宿主 fetch 的实际规范化一致),否则
 * `/__/../api/x`、`/%2e%2e/` 等遍历变体可借原始字符串 startsWith 绕过白名单,
 * 落点越界到非白名单 API;绝对 URL/协议相对 URL 因 origin 不符一律拒绝。
 */
export function isAllowedFetchPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  let url: URL;
  try {
    url = new URL(path, FETCH_PATH_BASE);
  } catch {
    return false;
  }
  if (url.origin !== FETCH_PATH_BASE) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return false; // 非法百分号编码,保守拒绝
  }
  // 解码后仍含 .. 点段(如 ..%2f 变体,URL 解析不会归一)即遍历,拒绝
  if (decoded.split('/').some((seg) => seg === '..')) return false;
  // 原始与解码路径都须以 /__ 开头(%5f 等编码拼写的前缀不放行,要求规范写法)
  return url.pathname.startsWith(FETCH_PATH_PREFIX) && decoded.startsWith(FETCH_PATH_PREFIX);
}

/** 代理前净化 init:剥离 x-stop-token(写操作凭证不得经外部插件转发) */
function sanitizeFetchInit(init?: BridgeFetchInit): BridgeFetchInit | undefined {
  if (!init) return undefined;
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(init.headers ?? {})) {
    if (k.toLowerCase() === 'x-stop-token') continue;
    headers[k] = v;
  }
  return { method: init.method, body: init.body, headers };
}

export interface HostBridgeOptions {
  /** iframe 的 contentWindow;null(未挂载)时忽略一切入站消息 */
  target: Window | null;
  /** zd:ready 握手时回传的初始状态 */
  getSnapshot: () => HostSnapshot;
  /** iframe 请求导航(宿主侧转 useRoute.navigate) */
  onNavigate: (params: Record<string, string>) => void;
  /** zd:fetch 代理实现(init 已在边界剥离 x-stop-token);缺省为同源 fetch */
  proxyFetch?: (path: string, init?: BridgeFetchInit) => Promise<{ status: number; body: unknown }>;
}

export interface HostBridge {
  /** 处理一条 message 事件(attach 后由 window message 监听自动调用) */
  handle(event: MessageEvent): void;
  attach(): void;
  sendTheme(theme: string, mode: string): void;
  sendNavigate(params: Record<string, string>): void;
  sendConfig(plugin: string, config: Record<string, unknown>): void;
  destroy(): void;
}

async function defaultProxyFetch(path: string, init?: BridgeFetchInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(path, init);
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* 非 JSON 保持文本 */ }
  return { status: res.status, body };
}

/** 宿主侧桥:ExternalWorkspace 持有,负责握手/主题推送/导航转发/fetch 代理 */
export function createHostBridge(opts: HostBridgeOptions): HostBridge {
  const proxyFetch = opts.proxyFetch ?? defaultProxyFetch;
  let destroyed = false;

  // 目标源 '*':iframe 沙箱未授 allow-same-origin,其 origin 对宿主不可知,'*' 为必要取舍;
  // 安全由 event.source 严格配对(handle 仅接受来自 opts.target 的消息)+ sandbox 隔离兜底
  // (约定见 design.md SDK 文档节)。
  const post = (payload: Record<string, unknown>) => {
    if (destroyed || !opts.target) return;
    opts.target.postMessage({ source: BRIDGE_SOURCE, ...payload }, '*');
  };

  const handle = (event: MessageEvent) => {
    if (destroyed || !opts.target || event.source !== opts.target) return;
    const msg = parseBridgeMessage(event.data, 'toHost');
    if (!msg) return;
    switch (msg.type) {
      case 'zd:ready':
        post({ type: 'zd:init', ...opts.getSnapshot() });
        break;
      case 'zd:navigate':
        opts.onNavigate(msg.params);
        break;
      case 'zd:fetch': {
        const { id, path } = msg;
        if (!isAllowedFetchPath(path)) {
          post({ type: 'zd:fetch:result', id, status: FORBIDDEN_STATUS, body: { error: 'forbidden' } });
          return;
        }
        void proxyFetch(path, sanitizeFetchInit(msg.init))
          .then((r) => post({ type: 'zd:fetch:result', id, status: r.status, body: r.body }))
          .catch(() => post({ type: 'zd:fetch:result', id, status: PROXY_FAILURE_STATUS, body: { error: 'proxy failed' } }));
        break;
      }
    }
  };

  const attach = () => { if (typeof window !== 'undefined') window.addEventListener('message', handle); };

  return {
    handle,
    attach,
    sendTheme: (theme, mode) => post({ type: 'zd:theme', theme, mode }),
    sendNavigate: (params) => post({ type: 'zd:navigate', params }),
    sendConfig: (plugin, config) => post({ type: 'zd:config', plugin, config }),
    destroy: () => {
      destroyed = true;
      if (typeof window !== 'undefined') window.removeEventListener('message', handle);
    },
  };
}

export interface PluginBridgeOptions {
  /** 宿主窗口;缺省 window.parent(测试可注入) */
  parent?: Window | null;
  onInit?: (payload: { theme: string; mode: string; params: Record<string, string>; config: Record<string, unknown> }) => void;
  onTheme?: (payload: { theme: string; mode: string }) => void;
  onNavigate?: (params: Record<string, string>) => void;
  onConfig?: (payload: { plugin: string; config: Record<string, unknown> }) => void;
}

export interface PluginBridge {
  handle(event: MessageEvent): void;
  attach(): void;
  /** 向宿主发起握手(宿主回 zd:init) */
  ready(): void;
  /** 经宿主代理请求同源 API(白名单 /__ 前缀);以 id 配对响应 */
  fetch(path: string, init?: BridgeFetchInit): Promise<{ status: number; body: unknown }>;
  destroy(): void;
}

/** 插件(iframe)侧桥:外部插件页面引入,与宿主握手并消费推送 */
export function createPluginBridge(opts: PluginBridgeOptions = {}): PluginBridge {
  const parent = opts.parent ?? (typeof window !== 'undefined' ? window.parent : null);
  let destroyed = false;
  let seq = 0;
  const pending = new Map<string, (r: { status: number; body: unknown }) => void>();

  // 目标源 '*':外部插件页运行于 iframe 沙箱(opaque origin),插件侧无法指定宿主精确 origin,
  // '*' 为必要取舍;安全由宿主侧 event.source 严格配对 + iframe sandbox 隔离兜底
  // (约定见 design.md SDK 文档节)。
  const post = (payload: Record<string, unknown>) => {
    if (destroyed || !parent) return;
    parent.postMessage({ source: BRIDGE_SOURCE, ...payload }, '*');
  };

  const handle = (event: MessageEvent) => {
    if (destroyed || !parent || event.source !== parent) return;
    const msg = parseBridgeMessage(event.data, 'toPlugin');
    if (!msg) return;
    switch (msg.type) {
      case 'zd:init':
        opts.onInit?.({ theme: msg.theme, mode: msg.mode, params: msg.params, config: msg.config });
        break;
      case 'zd:theme':
        opts.onTheme?.({ theme: msg.theme, mode: msg.mode });
        break;
      case 'zd:navigate':
        opts.onNavigate?.(msg.params);
        break;
      case 'zd:config':
        opts.onConfig?.({ plugin: msg.plugin, config: msg.config });
        break;
      case 'zd:fetch:result': {
        const resolve = pending.get(msg.id);
        if (!resolve) return; // 未知 id 丢弃
        pending.delete(msg.id);
        resolve({ status: msg.status, body: msg.body });
        break;
      }
    }
  };

  const attach = () => { if (typeof window !== 'undefined') window.addEventListener('message', handle); };

  return {
    handle,
    attach,
    ready: () => post({ type: 'zd:ready' }),
    fetch: (path, init) =>
      new Promise((resolve) => {
        const id = `f${++seq}`;
        pending.set(id, resolve);
        post({ type: 'zd:fetch', id, path, init });
      }),
    destroy: () => {
      destroyed = true;
      if (typeof window !== 'undefined') window.removeEventListener('message', handle);
      // 清理挂起的 fetch:以失败终态 settle,避免调用方 await 永久悬挂,并释放 pending 引用
      for (const resolve of pending.values()) resolve({ status: PROXY_FAILURE_STATUS, body: { error: 'bridge destroyed' } });
      pending.clear();
    },
  };
}
