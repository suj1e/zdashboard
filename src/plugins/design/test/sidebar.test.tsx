/**
 * T4 design Sidebar 验收:type/asset 入 URL;配置保存后 SSE config 事件触发资产重取。
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
    if (url.includes('/__plugins/config')) return json({});
    if (url.includes('/__design/assets')) return json(ASSETS);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('design Sidebar — type/asset 入 URL', () => {
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

describe('design Sidebar — 配置保存后 SSE config 重取', () => {
  it('config 事件到达 → /__design/assets 失效重取', async () => {
    setLocation('/?p=design');
    render(<Sidebar />);
    await screen.findByText('home.html');
    const fetchMock = vi.mocked(fetch);
    const callsBefore = fetchMock.mock.calls.filter(([u]) => String(u).includes('/__design/assets')).length;
    expect(callsBefore).toBeGreaterThanOrEqual(1);

    const es = FakeES.instances[0];
    await act(async () => {
      es.emit('config', { plugin: 'design' });
    });
    await waitFor(() => {
      const callsAfter = fetchMock.mock.calls.filter(([u]) => String(u).includes('/__design/assets')).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });
});
