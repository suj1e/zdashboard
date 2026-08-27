/**
 * T2 view Sidebar URL 接线验收:
 * - 深链接 ?p=view&wt=…&file=… → 对应文件高亮选中(URL→树选中反解);
 * - filter 参数预填过滤框,输入即写回 URL(replace);
 * - 点文件 → URL file(及所在 wt)更新;
 * - card=dirty 时 dirty worktree 行高亮;
 * - params 变化时树滚动容器不重挂载,滚动位置保持。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { TreeNode } from '../../../server/spec-scan.js';

const WORKTREES = [
  { path: '/wt/a', name: 'a', branch: 'feature/a', head: 'abc', dirty: true },
];

const WT_TREE: TreeNode[] = [
  { name: 'openspec', kind: 'dir', path: 'openspec', children: [
    { name: 'specs', kind: 'dir', path: 'openspec/specs', children: [
      { name: 'x.md', kind: 'file', path: 'openspec/specs/x.md' },
    ] },
  ] },
];

const ROOT_TREE: TreeNode[] = [
  { name: 'docs (1)', kind: 'dir', path: 'docs', children: [
    { name: 'README.md', kind: 'file', path: 'docs/README.md' },
  ] },
];

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v }) as Response;
    if (url.includes('/__plugins/config')) return json({});
    if (url.includes('/__worktrees')) return json(WORKTREES);
    if (url.includes('wt=%2Fwt%2Fa') || url.includes('wt=/wt/a')) return json({ tree: WT_TREE });
    if (url.includes('/__files')) return json({ tree: ROOT_TREE });
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

async function renderSidebar(url: string) {
  setLocation(url);
  render(<Sidebar />);
  // 等首屏树数据到位
  await screen.findByText('openspec');
}

describe('view Sidebar — URL→树选中反解(深链接)', () => {
  it('深链接 ?p=view&wt=…&file=… 渲染对应文件并高亮选中', async () => {
    await renderSidebar('/?p=view&wt=%2Fwt%2Fa&file=openspec%2Fspecs%2Fx.md');
    const item = screen.getByRole('button', { name: /x\.md/ });
    expect(item).toHaveClass('bg-primary/10'); // 选中态样式
  });

  it('URL 无 file 时无选中高亮', async () => {
    await renderSidebar('/?p=view');
    const item = screen.getByRole('button', { name: /x\.md/ });
    expect(item).not.toHaveClass('bg-primary/10');
  });
});

describe('view Sidebar — filter 入 URL', () => {
  it('URL filter 参数预填过滤框', async () => {
    await renderSidebar('/?p=view&filter=specs');
    const input = screen.getByPlaceholderText('过滤…') as HTMLInputElement;
    expect(input.value).toBe('specs');
  });

  it('输入过滤词写回 URL(replace)且树即时收窄', async () => {
    await renderSidebar('/?p=view');
    const input = screen.getByPlaceholderText('过滤…');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'specs' } });
    });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('filter')).toBe('specs');
    // 防抖后树收窄:README.md(root)被滤掉
    await screen.findByText('specs');
    expect(screen.queryByText('README.md')).not.toBeInTheDocument();
  });

  it('清空过滤词从 URL 删除 filter 键', async () => {
    await renderSidebar('/?p=view&filter=specs');
    const input = screen.getByPlaceholderText('过滤…');
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
    });
    expect(new URLSearchParams(window.location.search).has('filter')).toBe(false);
  });
});

describe('view Sidebar — 点文件入 URL', () => {
  it('worktree 分组内点文件 → file 与 wt 同写入 URL', async () => {
    await renderSidebar('/?p=view');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /x\.md/ }));
    });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('file')).toBe('openspec/specs/x.md');
    expect(q.get('wt')).toBe('/wt/a');
  });

  it('当前分支(根树)点文件 → file 写入且 wt 键删除', async () => {
    await renderSidebar('/?p=view&wt=%2Fwt%2Fa&file=openspec%2Fspecs%2Fx.md');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /README\.md/ }));
    });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('file')).toBe('docs/README.md');
    expect(q.has('wt')).toBe(false);
  });
});

describe('view Sidebar — card=dirty 钻取高亮', () => {
  it('card=dirty 且 worktree.dirty → 该 worktree 行高亮', async () => {
    await renderSidebar('/?p=view&card=dirty');
    const row = screen.getByRole('button', { name: /feature\/a/ });
    expect(row).toHaveAttribute('data-drill-dirty', 'true');
  });

  it('无 card 参数 → 不高亮', async () => {
    await renderSidebar('/?p=view');
    const row = screen.getByRole('button', { name: /feature\/a/ });
    expect(row).not.toHaveAttribute('data-drill-dirty');
  });
});

describe('view Sidebar — params 变化时滚动位置保持', () => {
  it('filter 输入引起 params 变化,树滚动容器 DOM 不换且 scrollTop 不变', async () => {
    await renderSidebar('/?p=view');
    const scroller = screen.getByTestId('view-tree-scroller');
    Object.defineProperty(scroller, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 200, configurable: true });
    scroller.scrollTop = 120;
    const before = scroller.scrollTop;
    const input = screen.getByPlaceholderText('过滤…');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'specs' } });
    });
    await screen.findByText('specs');
    expect(screen.getByTestId('view-tree-scroller')).toBe(scroller); // 同一 DOM 节点(未重挂载)
    expect(scroller.scrollTop).toBe(before);
  });
});
