/**
 * ux-low-batch T3:view 侧栏折叠集合持久化(`zd-view-collapse`)。
 * 折叠 worktree / 当前分支 → 卸载 → 重挂,折叠态保持(经 safeStorage 落盘)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { TreeNode } from '../../../server/spec-scan.js';

const WORKTREES = [{ path: '/wt/a', name: 'a', branch: 'feature/a', head: 'abc', dirty: false }];
const WT_TREE: TreeNode[] = [
  { name: 'docs', kind: 'dir', path: 'docs', children: [{ name: 'README.md', kind: 'file', path: 'docs/README.md' }] },
];
const ROOT_TREE: TreeNode[] = [
  { name: 'openspec', kind: 'dir', path: 'openspec', children: [{ name: 'spec.md', kind: 'file', path: 'openspec/spec.md' }] },
];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

function mockFetch(worktrees: typeof WORKTREES, rootTree: TreeNode[]) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__worktrees')) return okJson(worktrees);
    if (url.includes('/__files?wt=')) return okJson({ tree: WT_TREE });
    if (url.includes('/__files')) return okJson({ tree: rootTree });
    throw new Error(`unexpected fetch: ${url}`);
  }));
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

describe('view Sidebar — 折叠集合持久化(zd-view-collapse)', () => {
  it('折叠 worktree → 卸载重挂后保持折叠;再点展开 → 持久化为展开', async () => {
    mockFetch(WORKTREES, []);
    const { unmount } = render(<Sidebar />);
    expect(await screen.findByText('README.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /feature\/a/ }));
    expect(screen.queryByText('README.md')).toBeNull(); // 折叠生效

    // 写入 zd-view-collapse(JSON,含 wt 数组)
    expect(localStorage.getItem('zd-view-collapse')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('zd-view-collapse')!).wt).toContain('/wt/a');

    unmount();
    render(<Sidebar />);
    expect(await screen.findByText('feature/a')).toBeInTheDocument();
    expect(screen.queryByText('README.md')).toBeNull(); // 重挂后折叠态保持

    fireEvent.click(screen.getByRole('button', { name: /feature\/a/ })); // 展开
    expect(await screen.findByText('README.md')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('zd-view-collapse')!).wt).not.toContain('/wt/a');
  });

  it('折叠当前分支 → 卸载重挂后保持折叠', async () => {
    mockFetch([], ROOT_TREE);
    const { unmount } = render(<Sidebar />);
    expect(await screen.findByText('spec.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /当前分支/ }));
    expect(screen.queryByText('spec.md')).toBeNull();
    expect(JSON.parse(localStorage.getItem('zd-view-collapse')!).root).toBe(true);

    unmount();
    render(<Sidebar />);
    expect(await screen.findByText('当前分支')).toBeInTheDocument();
    expect(screen.queryByText('spec.md')).toBeNull(); // 重挂后保持折叠
  });
});
