/**
 * ux-low-batch T4:view 侧栏树/目录折叠按钮 aria-expanded。
 * worktree 按钮/当前分支按钮/TreeDir 目录按钮三处:展开=true,折叠=false。
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

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

beforeEach(() => {
  localStorage.clear();
  __resetPluginDataForTest();
  __resetRouterForTest();
  window.history.replaceState(null, '', '/?p=view');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__worktrees')) return okJson(WORKTREES);
    if (url.includes('/__files')) return okJson({ tree: WT_TREE });
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('view Sidebar — aria-expanded', () => {
  it('worktree 按钮:默认展开 true → 折叠 false → 再展开 true', async () => {
    render(<Sidebar />);
    const wt = await screen.findByRole('button', { name: /feature\/a/ });
    expect(wt).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(wt);
    expect(wt).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(wt);
    expect(wt).toHaveAttribute('aria-expanded', 'true');
  });

  it('当前分支按钮:aria-expanded 随折叠翻转', async () => {
    render(<Sidebar />);
    const root = await screen.findByRole('button', { name: /当前分支/ });
    expect(root).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(root);
    expect(root).toHaveAttribute('aria-expanded', 'false');
  });

  it('TreeDir 目录按钮:aria-expanded 反映目录开合', async () => {
    render(<Sidebar />);
    const dir = (await screen.findAllByRole('button', { name: /docs/ }))[0];
    expect(dir).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(dir);
    expect(dir).toHaveAttribute('aria-expanded', 'false');
  });
});
