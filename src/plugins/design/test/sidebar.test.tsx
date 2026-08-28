/**
 * design Sidebar 验收:约定化 —— 无配置入口,type/asset 入 URL;
 * SSE files 频道事件触发资产重取(配置频道已拆除)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { AssetType } from '../../../server/design-assets.js';

const ASSETS = {
  page: [{ path: 'a/home.html', name: 'home.html', ext: '.html', type: 'page' as AssetType }],
  token: [{ path: 'a/tokens.css', name: 'tokens.css', ext: '.css', type: 'token' as AssetType }],
  icon: [], component: [], md: [], video: [], audio: [], pdf: [], font: [],
};

/** jsdom 无 EventSource:可触发具名事件的桩 */
class FakeES {
  static instances: FakeES[] = [];
  listeners = new Map<string, Set<(e: unknown) => void>>();
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(name: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: unknown) => void) { this.listeners.get(name)?.delete(fn); }
  close(): void {}
  emit(name: string, data: unknown) {
    for (const fn of this.listeners.get(name) ?? []) fn({ data: JSON.stringify(data) });
  }
}

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  // 注意:useSSE 的 EventSource 单例是模块级、跨测试存活(同真实页面一条 /__reload 连接),
  // 因此这里不重置 instances,断言时用 instances[0]
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v }) as Response;
    // 配置链路已拆除:Sidebar 不得再请求 /__plugins/config
    if (url.includes('/__plugins/config')) throw new Error(`unexpected config fetch: ${url}`);
    if (url.includes('/__design/assets')) return json(ASSETS);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('design Sidebar — type/asset 入 URL(资产行渲染回归)', () => {
  it('渲染分组侧栏(有资产的组)', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    expect(await screen.findByText('页面')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('home.html')).toBeInTheDocument();
  });

  it('点资产 → type+asset 写回 URL 且高亮选中', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    fireEvent.click(await screen.findByText('tokens.css'));
    const q = new URLSearchParams(window.location.search);
    expect(q.get('type')).toBe('token');
    expect(q.get('asset')).toBe('a/tokens.css');
  });

  it('深链接 ?p=design&type=token&asset=… 反解选中高亮', async () => {
    setLocation('/?p=design&type=token&asset=a%2Ftokens.css');
    render(<Sidebar />);
    const item = await screen.findByRole('button', { name: /tokens\.css/ });
    expect(item).toHaveClass('bg-primary/10');
  });
});

describe('design Sidebar — 约定化(无配置入口,files 频道刷新)', () => {
  it('无「配置」按钮与配置面板(配置区整体拆除)', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    await screen.findByText('home.html');
    expect(screen.queryByText('配置')).not.toBeInTheDocument();
    expect(screen.queryByText(/保存中|配置已保存/)).not.toBeInTheDocument();
  });

  it('不发 /__plugins/config 请求(fetch mock 对 config URL 抛错)', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    await screen.findByText('home.html');
    const calls = vi.mocked(fetch).mock.calls.filter(([u]) => String(u).includes('/__plugins/config'));
    expect(calls).toEqual([]);
  });

  it('files 事件到达 → /__design/assets 失效重取(config 事件不再订阅)', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    await screen.findByText('home.html');
    const fetchMock = vi.mocked(fetch);
    const assetsCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('/__design/assets')).length;
    const callsBefore = assetsCalls();
    expect(callsBefore).toBeGreaterThanOrEqual(1);

    const es = FakeES.instances[0];
    await act(async () => {
      es.emit('files', { changed: ['a/tokens.css'] });
    });
    await waitFor(() => {
      expect(assetsCalls()).toBeGreaterThan(callsBefore);
    });

    // config 事件不应触发重取(旧订阅已拆除)
    const callsAtFiles = assetsCalls();
    await act(async () => {
      es.emit('config', { plugin: 'design' });
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(assetsCalls()).toBe(callsAtFiles);
  });
});
