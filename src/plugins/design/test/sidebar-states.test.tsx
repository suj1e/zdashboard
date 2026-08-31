/**
 * T2 design Sidebar 三态验收:
 * - loading → Skeleton;error → ErrorState(onRetry=reload);空 → EmptyState(约定目录引导)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
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

  it('空数据(九类资产全空)→ EmptyState 引导注明约定目录 .zdev/design', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson(EMPTY_ASSETS)));
    render(<Sidebar />);
    expect(await screen.findByText('暂无设计资产')).toBeInTheDocument();
    expect(screen.getByText(/\.zdev\/design/)).toBeInTheDocument();
  });
});
