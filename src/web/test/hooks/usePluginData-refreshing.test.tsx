/**
 * ux-low-batch T4:usePluginData 刷新轻反馈。
 * - 单测:后台 force 重取期间 refreshing=true(loading 且已有 data),完成后 false;
 * - 组件:view Sidebar 收到 files 事件静默重取时渲染 RefreshSpinner,完成即消失(不闪骨架)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook, waitFor as waitForHook } from '@testing-library/react';
import { usePluginData, __resetPluginDataForTest, notifyPluginEvent } from '../../hooks/usePluginData.js';
import Sidebar from '../../../plugins/view/Sidebar.js';
import { __resetRouterForTest } from '../../router.js';
import type { TreeNode } from '../../../server/spec-scan.js';

const WORKTREES = [{ path: '/wt/a', name: 'a', branch: 'feature/a', head: 'abc', dirty: false }];
const ROOT_TREE: TreeNode[] = [
  { name: 'docs', kind: 'dir', path: 'docs', children: [{ name: 'README.md', kind: 'file', path: 'docs/README.md' }] },
];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

beforeEach(() => {
  localStorage.clear();
  __resetPluginDataForTest();
  __resetRouterForTest();
  window.history.replaceState(null, '', '/?p=view');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('usePluginData — refreshing 派生字段(单测)', () => {
  it('首载:loading=true 且 data=null → refreshing=false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ v: 1 })));
    const { result } = renderHook(() => usePluginData('k', async () => ({ v: 1 })));
    expect(result.current.loading).toBe(true);
    expect(result.current.refreshing).toBe(false); // 首载走骨架,不算「刷新中」
    await waitForHook(() => expect(result.current.data).not.toBeNull());
    expect(result.current.refreshing).toBe(false);
  });

  it('已有 data 后 reload(force)→ refreshing=true,完成回落 false', async () => {
    let gate: ((v: unknown) => void) | null = null;
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) return okJson({ v: 1 });
      return await new Promise((resolve) => { gate = resolve; });
    }));
    const { result } = renderHook(() => usePluginData('k', async () => {
      const r = await fetch('/x');
      return await r.json() as { v: number };
    }));
    await waitForHook(() => expect(result.current.data).toEqual({ v: 1 }));

    act(() => { result.current.reload(); });
    await waitForHook(() => {
      expect(result.current.loading).toBe(true);
      expect(result.current.refreshing).toBe(true); // 后台刷新中
    });
    act(() => { gate?.({ ok: true, json: async () => ({ v: 2 }) }); });
    await waitForHook(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.data).toEqual({ v: 2 });
  });
});

describe('view Sidebar — files 事件刷新轻 spinner(组件)', () => {
  function stubNormalFetch() {
    vi.stubGlobal('EventSource', class { constructor(public url: string) {} addEventListener() {} removeEventListener() {} close() {} });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__worktrees')) return okJson(WORKTREES);
      if (url.includes('/__files')) return okJson({ tree: ROOT_TREE });
      throw new Error(`unexpected fetch: ${url}`);
    }));
  }

  it('静默重取期间出现 refresh-spinner,数据到达后消失;骨架与旧内容不闪', async () => {
    stubNormalFetch();
    render(<Sidebar />);
    (await screen.findAllByText('README.md'))[0];

    // 下一次重取挂起:模拟后台刷新进行中
    let release: ((r: Response) => void) | null = null;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__worktrees')) {
        return await new Promise<Response>((resolve) => { release = () => resolve(okJson(WORKTREES)); });
      }
      if (url.includes('/__files')) return okJson({ tree: ROOT_TREE });
      throw new Error(`unexpected fetch: ${url}`);
    });
    act(() => { notifyPluginEvent('files'); });
    expect(await screen.findByTestId('refresh-spinner')).toBeInTheDocument(); // 重取中轻指示
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();      // 不闪骨架
    expect((await screen.findAllByText('README.md')).length).toBeGreaterThan(0); // 旧内容不卸载

    act(() => { release?.(okJson(WORKTREES)); });
    await waitFor(() => expect(screen.queryByTestId('refresh-spinner')).toBeNull());
  });
});
