/**
 * T2 design Sidebar 三态验收:
 * - loading → Skeleton;error → ErrorState(onRetry=reload);空 → EmptyState(约定目录引导)。
 * SSE 静默刷新:已有 data 时 files 事件 force 重取不渲染 Skeleton、旧列表不卸载。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest, notifyPluginEvent } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

const ASSETS = {
  page: [{ path: 'a/home.html', name: 'home.html', ext: '.html', type: 'page' }],
  icon: [], component: [], token: [], md: [], video: [], audio: [], pdf: [], font: [],
};
const EMPTY_ASSETS = { page: [], icon: [], component: [], token: [], md: [], video: [], audio: [], pdf: [], font: [] };

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}
function serverError(body: unknown) {
  return { ok: false, status: 500, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  setLocation('/?p=design');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('design Sidebar — 三态接线', () => {
  it('loading(fetch 挂起)→ Skeleton 占位', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    render(<Sidebar />);
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mock 500 → ErrorState;点重试 → reload 重取,成功后渲染资产', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async () => (fail ? serverError({ error: 'assets boom' }) : okJson(ASSETS))));
    render(<Sidebar />);
    expect(await screen.findByRole('alert')).toHaveTextContent('assets boom');

    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fail = false; // 服务恢复
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByText('home.html');
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('空数据(九类资产全空)→ EmptyState 引导「未发现 .zdev/design 资产 · 运行 zdesign 生成」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson(EMPTY_ASSETS)));
    render(<Sidebar />);
    expect(await screen.findByText('未发现 .zdev/design 资产')).toBeInTheDocument();
    expect(screen.getByText('运行 zdesign 生成')).toBeInTheDocument();
    // 旧文案不再出现
    expect(screen.queryByText('暂无设计资产')).not.toBeInTheDocument();
  });

  it('SSE 静默刷新:已有 data 时 files 事件 force 重取,不渲染 Skeleton、旧列表不卸载', async () => {
    let slow = false;
    vi.stubGlobal('fetch', vi.fn(async () => (slow ? new Promise<Response>(() => {}) : okJson(ASSETS))));
    render(<Sidebar />);
    expect(await screen.findByText('home.html')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();

    slow = true;
    act(() => { notifyPluginEvent('files'); });
    // 旧实现:loading 随 force 置 true → Skeleton 与旧列表同时渲染(重复闪烁源),此断言红
    expect(screen.getByText('home.html')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('folder 过滤无匹配 → 「无匹配结果」,不误显「暂无设计资产」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson(ASSETS)));
    setLocation('/?p=design&folder=zzz/');
    render(<Sidebar />);
    expect(await screen.findByText('无匹配结果')).toBeInTheDocument();
    expect(screen.queryByText('暂无设计资产')).not.toBeInTheDocument();
  });
});
