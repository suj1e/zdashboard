/**
 * ux-low-batch T3:design 侧栏分组展开态持久化(`zd-design-groups`)。
 * 折叠分组 → 卸载 → 重挂,该组保持折叠、其余组不受影响(经 safeStorage 落盘)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { AssetType } from '../../../server/design-assets.js';

const ASSETS: Record<AssetType, Array<{ path: string; name: string; ext: string; type: AssetType }>> = {
  page: [{ path: 'a/home.html', name: 'home.html', ext: '.html', type: 'page' }],
  token: [{ path: 'a/tokens.css', name: 'tokens.css', ext: '.css', type: 'token' }],
  icon: [], component: [], md: [], video: [], audio: [], pdf: [], font: [],
};

beforeEach(() => {
  localStorage.clear();
  __resetPluginDataForTest();
  __resetRouterForTest();
  window.history.replaceState(null, '', '/?p=design');
  vi.stubGlobal('EventSource', class { constructor(public url: string) {} addEventListener() {} removeEventListener() {} close() {} });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__design/assets')) {
      return { ok: true, status: 200, json: async () => ASSETS } as unknown as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('design Sidebar — 分组展开持久化(zd-design-groups)', () => {
  it('折叠「页面」组 → 卸载重挂后该组保持折叠,其余组照常展开', async () => {
    const { unmount } = render(<Sidebar />);
    expect(await screen.findByText('home.html')).toBeInTheDocument();
    expect(screen.getByText('tokens.css')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /页面/ }));
    expect(screen.queryByText('home.html')).toBeNull(); // 折叠生效
    expect(screen.getByText('tokens.css')).toBeInTheDocument(); // 他组不受影响

    expect(localStorage.getItem('zd-design-groups')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('zd-design-groups')!);
    expect(stored.page).toBe(false);

    unmount();
    render(<Sidebar />);
    expect(await screen.findByText('页面')).toBeInTheDocument();
    expect(screen.queryByText('home.html')).toBeNull(); // 重挂后保持折叠
    expect(screen.getByText('tokens.css')).toBeInTheDocument(); // Tokens 组仍展开

    fireEvent.click(screen.getByRole('button', { name: /页面/ })); // 重新展开
    expect(await screen.findByText('home.html')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('zd-design-groups')!).page).toBe(true);
  });
});
