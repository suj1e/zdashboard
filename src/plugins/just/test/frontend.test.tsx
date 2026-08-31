/**
 * just 前端验收(去侧栏后):
 * - web.tsx 不再导出 sidebar —— 任务选择面唯一入口是 LogViewer 内嵌列表;
 * - LogViewer 内嵌 recipe 列表(FilterPills 药丸行)点选 → recipe 入 URL、task 置空、选中高亮;
 * - LogViewer 选中项由 URL(task ?? recipe)驱动;无选中 → 总控台视图。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Workspace from '../Workspace.js';
import webPlugin from '../web.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

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
  // useSSE 的 EventSource 单例跨测试存活(同真实页面一条连接),不重置 instances
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // fetchJson 门卫消费端:mock 必须模拟真实 Response 的 ok/status
    const json = (v: unknown) => ({ ok: true, status: 200, json: async () => v }) as unknown as Response;
    if (url.includes('/__just/recipes')) return json([{ name: 'dev-server', description: 'dev' }, { name: 'build', description: 'b' }]);
    if (url.includes('/__config')) return json({ stopToken: 'tok' });
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('just web 插件定义 — 去侧栏', () => {
  it('web.tsx 不再含 sidebar 导出(SidebarFrame 判空自动收栏,选择面收敛到 LogViewer)', () => {
    expect(webPlugin.sidebar).toBeUndefined();
    expect(webPlugin.workspace).toBeDefined();
  });
});

describe('just LogViewer 内嵌列表 — 点 recipe → URL param', () => {
  it('?p=just 总控台:点药丸行 recipe → recipe 入 URL 且 task 置空,LogViewer 聚焦该任务', async () => {
    setLocation('/?p=just');
    const { rerender } = render(<Workspace params={new URLSearchParams('?p=just')} />);
    const pills = await screen.findByRole('group', { name: '任务筛选' });
    const pill = within(pills).getByText('dev-server');
    // findBy 在 act 外轮询;仅点击包 act
    await act(async () => {
      fireEvent.click(pill);
    });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('p')).toBe('just');
    expect(q.get('recipe')).toBe('dev-server');
    expect(q.get('task')).toBeNull();
    // App 按 URL 变化以新 params 重渲染 Workspace → LogViewer 聚焦该任务(单任务视图含清屏)
    rerender(<Workspace params={new URLSearchParams(window.location.search)} />);
    expect(await screen.findByText('清屏')).toBeInTheDocument();
    const pillsAfter = screen.getByRole('group', { name: '任务筛选' });
    expect(within(pillsAfter).getByText('dev-server').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(within(pillsAfter).getByText('总控台').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('just Workspace — 面板撑满主区', () => {
  it('容器去 max-w-6xl(撑满主区,mx-auto 保留无害)', () => {
    setLocation('/?p=just');
    const { container } = render(<Workspace params={new URLSearchParams('?p=just')} />);
    const panel = document.querySelector('[data-plugin-page="just"] div.bg-background');
    expect(panel).not.toBeNull();
    expect(panel!.className).not.toContain('max-w-6xl');
    // 整个工作区渲染树无任何限宽类
    expect(container.querySelector('.max-w-6xl')).toBeNull();
  });
});

describe('just Workspace — recipe/task 入 URL', () => {
  it('?p=just&task=dev-server → LogViewer 聚焦该任务(单任务视图含清屏)', async () => {
    setLocation('/?p=just&task=dev-server');
    render(<Workspace params={new URLSearchParams('?p=just&task=dev-server')} />);
    expect(await screen.findByText('dev-server')).toBeInTheDocument();
    expect(await screen.findByText('清屏')).toBeInTheDocument();
  });

  it('URL 无选中 → 总控台视图(无清屏按钮)', async () => {
    setLocation('/?p=just');
    render(<Workspace params={new URLSearchParams('?p=just')} />);
    expect(await screen.findByText('总控台')).toBeInTheDocument();
    expect(screen.queryByText('清屏')).not.toBeInTheDocument();
  });
});
