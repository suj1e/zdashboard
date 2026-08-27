/**
 * T5 just 前端验收:
 * - 活跃任务侧栏(/__just/tasks,subscribe plugin:just:state):运行中任务列表,点击 task 入 URL;
 * - recipes 走 usePluginData;LogViewer 选中项由 URL(task ?? recipe)驱动。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Sidebar from '../Sidebar.js';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

const TASKS = [
  { recipe: 'dev-server', state: 'running', code: null, startedAt: 1 },
  { recipe: 'build', state: 'exited', code: 0, startedAt: 1 },
];

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
    const json = (v: unknown) => ({ json: async () => v }) as Response;
    if (url.includes('/__just/tasks')) return json(TASKS);
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

describe('just Sidebar — 活跃任务侧栏', () => {
  it('列出运行中任务,退出任务不在活跃区', async () => {
    setLocation('/?p=just');
    render(<Sidebar />);
    expect(await screen.findByText('dev-server')).toBeInTheDocument();
    expect(screen.queryByText('build')).not.toBeInTheDocument();
    expect(screen.getByText(/活跃任务/)).toBeInTheDocument();
  });

  it('点活跃任务 → task+recipe 入 URL', async () => {
    setLocation('/?p=just');
    render(<Sidebar />);
    // findBy 在 act 外轮询;仅点击包 act
    const item = await screen.findByText('dev-server');
    await act(async () => {
      fireEvent.click(item);
    });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('task')).toBe('dev-server');
    expect(q.get('recipe')).toBe('dev-server');
  });

  it('无运行中任务 → 空态提示(边界)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (v: unknown) => ({ json: async () => v }) as Response;
      if (url.includes('/__just/tasks')) return json([]);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    setLocation('/?p=just');
    render(<Sidebar />);
    expect(await screen.findByText('暂无活跃任务')).toBeInTheDocument();
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
