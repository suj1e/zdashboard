/**
 * 桥协议单元测试(zd:ready/init/theme/navigate/fetch/config):
 * - source 字段校验(缺/错/方向错均丢弃)
 * - 未知 type 丢弃
 * - fetch 代理白名单(/__ 前缀放行,其余拒绝 403)
 * - id 配对回传(含并发)
 * - 代理剥离 x-stop-token(外部插件不可获得写权限)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BRIDGE_SOURCE,
  FETCH_PATH_PREFIX,
  FORBIDDEN_STATUS,
  PROXY_FAILURE_STATUS,
  parseBridgeMessage,
  isAllowedFetchPath,
  createHostBridge,
  createPluginBridge,
} from '../bridge.js';
import type { HostSnapshot } from '../bridge.js';

/** 构造带 source 的合成 MessageEvent(jsdom 不便从构造器注入任意 source) */
function msgEvent(data: unknown, source: unknown): MessageEvent {
  const ev = new MessageEvent('message', { data });
  Object.defineProperty(ev, 'source', { value: source, configurable: true });
  return ev;
}

/** 假窗口:只关心 postMessage 调用记录,同时充当 event.source 身份 */
function fakeWindow() {
  return { postMessage: vi.fn() } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };
}

function bridgeMsg(payload: Record<string, unknown>) {
  return { source: BRIDGE_SOURCE, ...payload };
}

const snapshot = (): HostSnapshot => ({
  theme: 'pixel',
  mode: 'light',
  params: { file: 'a.md' },
  config: { greeting: 'hi' },
});

describe('isAllowedFetchPath — zd:fetch 白名单', () => {
  it(`以 ${FETCH_PATH_PREFIX} 开头的路径放行`, () => {
    expect(isAllowedFetchPath('/__stats/data')).toBe(true);
    expect(isAllowedFetchPath('/__config')).toBe(true);
  });

  it('非 /__ 前缀一律拒绝(含绝对 URL、协议相对、空值)', () => {
    expect(isAllowedFetchPath('/api/secret')).toBe(false);
    expect(isAllowedFetchPath('http://evil.example/__x')).toBe(false);
    expect(isAllowedFetchPath('//evil.example/__x')).toBe(false);
    expect(isAllowedFetchPath('/')).toBe(false);
    expect(isAllowedFetchPath('')).toBe(false);
    expect(isAllowedFetchPath(undefined)).toBe(false);
    expect(isAllowedFetchPath(123)).toBe(false);
  });

  it('路径遍历变体拒绝:先按 URL 规范化再判定,防原始字符串前缀绕过', () => {
    // 点段遍历:宿主 fetch 会规范化为 /api/…,若按原始 startsWith('/__') 判定即被绕过
    expect(isAllowedFetchPath('/__/../api/secret')).toBe(false);
    expect(isAllowedFetchPath('/__stats/../api/secret')).toBe(false);
    // 百分号编码的点段(%2e)与编码斜杠(%2f):服务端解码后即 ..
    expect(isAllowedFetchPath('/%2e%2e/api/secret')).toBe(false);
    expect(isAllowedFetchPath('/%2e%2e%2fapi/secret')).toBe(false);
    expect(isAllowedFetchPath('/__stats/%2e%2e/api/secret')).toBe(false);
    expect(isAllowedFetchPath('/__x/..%2f..%2fapi')).toBe(false);
  });

  it('绝对 URL 与协议相对 URL 不因前缀碰巧含 /__ 而放行', () => {
    expect(isAllowedFetchPath('https://example.com/__stats/data')).toBe(false);
    expect(isAllowedFetchPath('//example.com/__stats/data')).toBe(false);
    // 反斜杠在 WHATWG 解析中等价斜杠,可能引入 authority 段,同样按 origin 判定拒绝
    expect(isAllowedFetchPath('/\\__stats/data')).toBe(false);
  });
});

describe('parseBridgeMessage — 协议消息解析与丢弃', () => {
  it('source 字段缺失或非 zdashboard 时返回 null', () => {
    expect(parseBridgeMessage({ type: 'zd:ready' }, 'toHost')).toBeNull();
    expect(parseBridgeMessage({ source: 'other', type: 'zd:ready' }, 'toHost')).toBeNull();
    expect(parseBridgeMessage(null, 'toHost')).toBeNull();
    expect(parseBridgeMessage('zd:ready', 'toHost')).toBeNull();
  });

  it('未知 type 丢弃', () => {
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:hack' }), 'toHost')).toBeNull();
  });

  it('方向不符的消息丢弃(iframe 不能发 zd:init,宿主不能发 zd:ready)', () => {
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:init' }), 'toHost')).toBeNull();
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:ready' }), 'toPlugin')).toBeNull();
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:fetch' }), 'toPlugin')).toBeNull();
    // zd:config 已收窄为宿主→iframe 单向(design 协议修订记录):iframe→宿主发送一律丢弃
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:config', plugin: 'demo', config: {} }), 'toHost')).toBeNull();
  });

  it('合法消息按方向解析,载荷原样保留', () => {
    const fetch = parseBridgeMessage(
      bridgeMsg({ type: 'zd:fetch', id: 'f1', path: '/__stats/data', init: { method: 'GET' } }),
      'toHost',
    );
    expect(fetch).toMatchObject({ type: 'zd:fetch', id: 'f1', path: '/__stats/data' });

    const result = parseBridgeMessage(
      bridgeMsg({ type: 'zd:fetch:result', id: 'f1', status: 200, body: { ok: 1 } }),
      'toPlugin',
    );
    expect(result).toMatchObject({ type: 'zd:fetch:result', id: 'f1', status: 200 });
  });

  it('载荷形状非法丢弃(zd:fetch 缺 id/path,zd:navigate 缺 params)', () => {
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:fetch', path: '/__x' }), 'toHost')).toBeNull();
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:fetch', id: 'f1' }), 'toHost')).toBeNull();
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:navigate' }), 'toHost')).toBeNull();
    expect(parseBridgeMessage(bridgeMsg({ type: 'zd:fetch:result', id: 'f1' }), 'toPlugin')).toBeNull();
  });
});

describe('createHostBridge — 宿主侧', () => {
  let iframeWin: ReturnType<typeof fakeWindow>;

  beforeEach(() => {
    iframeWin = fakeWindow();
  });

  function makeBridge(overrides: Partial<Parameters<typeof createHostBridge>[0]> = {}) {
    return createHostBridge({
      target: iframeWin,
      getSnapshot: snapshot,
      onNavigate: vi.fn(),
      ...overrides,
    });
  }

  it('zd:ready → 回 zd:init,载荷含当前 theme/mode/params/config', () => {
    const bridge = makeBridge();
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:ready' }), iframeWin));

    expect(iframeWin.postMessage).toHaveBeenCalledTimes(1);
    const sent = iframeWin.postMessage.mock.calls[0][0];
    expect(sent).toEqual(bridgeMsg({ type: 'zd:init', theme: 'pixel', mode: 'light', params: { file: 'a.md' }, config: { greeting: 'hi' } }));
    expect(iframeWin.postMessage.mock.calls[0][1]).toBe('*');
  });

  it('zd:navigate → 转发 onNavigate(params)', () => {
    const onNavigate = vi.fn();
    const bridge = makeBridge({ onNavigate });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:navigate', params: { view: 'stats' } }), iframeWin));
    expect(onNavigate).toHaveBeenCalledWith({ view: 'stats' });
    expect(iframeWin.postMessage).not.toHaveBeenCalled();
  });

  it('白名单放行:zd:fetch /__ 前缀路径 → proxyFetch 后按 id 回传 zd:fetch:result', async () => {
    const proxyFetch = vi.fn().mockResolvedValue({ status: 200, body: { ok: true } });
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'f1', path: '/__stats/data' }), iframeWin));
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(1));

    expect(proxyFetch).toHaveBeenCalledWith('/__stats/data', undefined);
    expect(iframeWin.postMessage.mock.calls[0][0]).toEqual(
      bridgeMsg({ type: 'zd:fetch:result', id: 'f1', status: 200, body: { ok: true } }),
    );
  });

  it('白名单拒绝:非 /__ 路径不触发代理,直接回 403 result(同 id)', async () => {
    const proxyFetch = vi.fn();
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'f2', path: '/api/secret' }), iframeWin));
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(1));

    expect(proxyFetch).not.toHaveBeenCalled();
    const sent = iframeWin.postMessage.mock.calls[0][0];
    expect(sent).toEqual(bridgeMsg({ type: 'zd:fetch:result', id: 'f2', status: 403, body: { error: 'forbidden' } }));
  });

  it('白名单拒绝路径遍历变体:规范化后落点越界即回 403,不触发代理', async () => {
    const proxyFetch = vi.fn();
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'f5', path: '/__/../api/secret' }), iframeWin));
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'f6', path: '/%2e%2e%2fapi/secret' }), iframeWin));
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(2));

    expect(proxyFetch).not.toHaveBeenCalled();
    const sent = iframeWin.postMessage.mock.calls.map((c) => c[0]) as Array<Record<string, unknown>>;
    expect(sent.find((m) => m.id === 'f5')).toMatchObject({ type: 'zd:fetch:result', status: 403 });
    expect(sent.find((m) => m.id === 'f6')).toMatchObject({ type: 'zd:fetch:result', status: 403 });
  });

  it('并发两个 zd:fetch,各自按 id 配对回传不串扰', async () => {
    const proxyFetch = vi.fn()
      .mockResolvedValueOnce({ status: 200, body: 'first' })
      .mockResolvedValueOnce({ status: 404, body: 'second' });
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'a', path: '/__x' }), iframeWin));
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'b', path: '/__y' }), iframeWin));
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(2));

    const sent = iframeWin.postMessage.mock.calls.map((c) => c[0]) as Array<Record<string, unknown>>;
    const a = sent.find((m) => m.id === 'a');
    const b = sent.find((m) => m.id === 'b');
    expect(a).toEqual(bridgeMsg({ type: 'zd:fetch:result', id: 'a', status: 200, body: 'first' }));
    expect(b).toEqual(bridgeMsg({ type: 'zd:fetch:result', id: 'b', status: 404, body: 'second' }));
  });

  it('代理剥离 x-stop-token 请求头,外部插件不可借道获得写权限', async () => {
    const proxyFetch = vi.fn().mockResolvedValue({ status: 200, body: null });
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(
      msgEvent(
        bridgeMsg({ type: 'zd:fetch', id: 'f3', path: '/__stop', init: { method: 'POST', headers: { 'x-stop-token': 'stolen', 'x-other': 'v' } } }),
        iframeWin,
      ),
    );
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(1));

    expect(proxyFetch).toHaveBeenCalledWith('/__stop', { method: 'POST', headers: { 'x-other': 'v' } });
  });

  it('代理抛错时回 5xx result,不悬挂 id', async () => {
    const proxyFetch = vi.fn().mockRejectedValue(new Error('boom'));
    const bridge = makeBridge({ proxyFetch });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch', id: 'f4', path: '/__x' }), iframeWin));
    await vi.waitFor(() => expect(iframeWin.postMessage).toHaveBeenCalledTimes(1));

    expect(iframeWin.postMessage.mock.calls[0][0]).toMatchObject({ type: 'zd:fetch:result', id: 'f4', status: 502 });
  });

  it('source 非 iframe 窗口的消息丢弃', () => {
    const bridge = makeBridge();
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:ready' }), fakeWindow()));
    expect(iframeWin.postMessage).not.toHaveBeenCalled();
  });

  it('sendTheme/sendConfig 向 iframe 推送对应协议消息', () => {
    const bridge = makeBridge();
    bridge.sendTheme('slate', 'dark');
    bridge.sendConfig('demo', { k: 1 });
    expect(iframeWin.postMessage.mock.calls[0][0]).toEqual(bridgeMsg({ type: 'zd:theme', theme: 'slate', mode: 'dark' }));
    expect(iframeWin.postMessage.mock.calls[1][0]).toEqual(bridgeMsg({ type: 'zd:config', plugin: 'demo', config: { k: 1 } }));
  });

  it('destroy 后不再响应消息', () => {
    const bridge = makeBridge();
    bridge.destroy();
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:ready' }), iframeWin));
    expect(iframeWin.postMessage).not.toHaveBeenCalled();
  });
});

describe('createPluginBridge — iframe 侧', () => {
  let parentWin: ReturnType<typeof fakeWindow>;

  beforeEach(() => {
    parentWin = fakeWindow();
  });

  function makeBridge(overrides: Partial<Parameters<typeof createPluginBridge>[0]> = {}) {
    return createPluginBridge({ parent: parentWin, ...overrides });
  }

  it('ready() 向宿主发送 zd:ready', () => {
    const bridge = makeBridge();
    bridge.ready();
    expect(parentWin.postMessage).toHaveBeenCalledWith(bridgeMsg({ type: 'zd:ready' }), '*');
  });

  it('zd:init/zd:theme/zd:config 触发对应回调', () => {
    const onInit = vi.fn();
    const onTheme = vi.fn();
    const onConfig = vi.fn();
    const bridge = makeBridge({ onInit, onTheme, onConfig });

    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:init', theme: 'pixel', mode: 'light', params: { a: '1' }, config: {} }), parentWin));
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:theme', theme: 'slate', mode: 'dark' }), parentWin));
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:config', plugin: 'demo', config: { k: 2 } }), parentWin));

    expect(onInit).toHaveBeenCalledWith({ theme: 'pixel', mode: 'light', params: { a: '1' }, config: {} });
    expect(onTheme).toHaveBeenCalledWith({ theme: 'slate', mode: 'dark' });
    expect(onConfig).toHaveBeenCalledWith({ plugin: 'demo', config: { k: 2 } });
  });

  it('zd:navigate(宿主→iframe)触发 onNavigate', () => {
    const onNavigate = vi.fn();
    const bridge = makeBridge({ onNavigate });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:navigate', params: { file: 'b.md' } }), parentWin));
    expect(onNavigate).toHaveBeenCalledWith({ file: 'b.md' });
  });

  it('非宿主窗口来源的消息丢弃', () => {
    const onInit = vi.fn();
    const bridge = makeBridge({ onInit });
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:init', theme: 'x', mode: 'dark', params: {}, config: {} }), fakeWindow()));
    expect(onInit).not.toHaveBeenCalled();
  });

  it('fetch() 发出 zd:fetch 并在收到同 id 的 zd:fetch:result 时 resolve(并发 id 互不串扰)', async () => {
    const bridge = makeBridge();
    const p1 = bridge.fetch('/__stats/data');
    const p2 = bridge.fetch('/__demo/api', { method: 'GET' });

    // 两条请求均已发出,id 递增且带 path/init
    const calls = parentWin.postMessage.mock.calls.map((c) => c[0]) as Array<Record<string, unknown>>;
    expect(calls).toHaveLength(2);
    const id1 = calls[0].id as string;
    const id2 = calls[1].id as string;
    expect(id1).not.toEqual(id2);
    expect(calls[0]).toMatchObject({ type: 'zd:fetch', path: '/__stats/data' });
    expect(calls[1]).toMatchObject({ type: 'zd:fetch', path: '/__demo/api', init: { method: 'GET' } });

    // 先回第二个,再回第一个:配对不因顺序颠倒而串扰
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch:result', id: id2, status: 403, body: { error: 'forbidden' } }), parentWin));
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch:result', id: id1, status: 200, body: { ok: 1 } }), parentWin));

    await expect(p2).resolves.toEqual({ status: 403, body: { error: 'forbidden' } });
    await expect(p1).resolves.toEqual({ status: 200, body: { ok: 1 } });
  });

  it('未知 id 的 zd:fetch:result 丢弃,不产生未处理拒绝', async () => {
    const bridge = makeBridge();
    const p = bridge.fetch('/__x');
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch:result', id: 'nope', status: 500, body: null }), parentWin));
    expect(parentWin.postMessage).toHaveBeenCalledTimes(1);
    // 已挂起的 fetch 仍未 settle
    let settled = false;
    void p.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it('destroy 后挂起的 fetch 以失败终态 settle,pending 清空,迟到 result 不再回传', async () => {
    const bridge = makeBridge();
    const p = bridge.fetch('/__x');
    expect(parentWin.postMessage).toHaveBeenCalledTimes(1);

    let settled: { status: number; body: unknown } | null = null;
    void p.then((r) => { settled = r; });
    bridge.destroy();
    await vi.waitFor(() => expect(settled).not.toBeNull());
    expect(settled).toEqual({ status: PROXY_FAILURE_STATUS, body: { error: 'bridge destroyed' } });

    // 迟到的 result:已销毁,不再 postMessage(重复计数守卫),亦无未处理拒绝
    bridge.handle(msgEvent(bridgeMsg({ type: 'zd:fetch:result', id: 'f1', status: 200, body: { ok: 1 } }), parentWin));
    expect(parentWin.postMessage).toHaveBeenCalledTimes(1);
  });
});
