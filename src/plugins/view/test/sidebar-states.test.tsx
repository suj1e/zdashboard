/**
 * T2 view Sidebar 三态验收:
 * - loading → Skeleton 占位;error → ErrorState(onRetry=reload);空 → EmptyState(注明约定扫描目录)。
 * 契约:fetcher 错误一律传播(fetchJson 门卫),不再 .catch(() => []) 缓存为空数据。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { TreeNode } from '../../../server/spec-scan.js';

const WORKTREES = [{ path: '/wt/a', name: 'a', branch: 'feature/a', head: 'abc', dirty: false }];
const ROOT_TREE: TreeNode[] = [
  { name: 'docs', kind: 'dir', path: 'docs', children: [{ name: 'README.md', kind: 'file', path: 'docs/README.md' }] },
];

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
  setLocation('/?p=view');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('view Sidebar — 三态接线', () => {
  it('loading(fetch 挂起)→ Skeleton 占位,无错误提示', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    render(<Sidebar />);
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mock 500 → ErrorState 展示 body error 字段;点重试 → reload 重新 fetch 且成功后渲染树', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (fail) return serverError({ error: 'boom' });
      if (url.includes('/__worktrees')) return okJson(WORKTREES);
      if (url.includes('/__files')) return okJson({ tree: ROOT_TREE });
      throw new Error(`unexpected fetch: ${url}`);
    }));
    render(<Sidebar />);
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    expect(screen.queryByText('README.md')).toBeNull(); // 错误不缓存为空树

    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fail = false; // 服务恢复
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // worktree 树与当前分支树共用同一 mock 树 → README.md 出现两处,断言全部渲染即恢复成功
    expect((await screen.findAllByText('README.md')).length).toBeGreaterThan(0);
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore); // reload 触发了重取
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('空数据(worktrees 与 root 树均空)→ EmptyState 引导且注明约定扫描目录', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__worktrees')) return okJson([]);
      if (url.includes('/__files')) return okJson({ tree: [] });
      throw new Error(`unexpected fetch: ${url}`);
    }));
    render(<Sidebar />);
    expect(await screen.findByText('暂无可展示的规格文件')).toBeInTheDocument();
    expect(screen.getByText(/openspec\s*\/\s*docs\s*\/\s*\.zdev\/apply/)).toBeInTheDocument();
  });
});
