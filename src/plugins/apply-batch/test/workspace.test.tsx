/**
 * T6 apply-batch 前端验收:
 * - 删 2s 轮询(DevTools 无轮询请求);usePluginData subscribe state 频道,<1s UI 更新;
 * - view/sel 入 URL(三视图 + 选中 change);store 类型改 import type。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import { __resetStopTokenForTest } from '../../../web/lib/stop-token.js';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const STATE = {
  version: '1',
  status: 'running',
  changes: [
    { name: 'alpha', path: 'x', status: 'running', priority: 1, risk: 'low', dependencies: [], estimatedDuration: 1, batchIndex: 0, retryCount: 0 },
    { name: 'beta', path: 'y', status: 'failed', priority: 2, risk: 'medium', dependencies: ['alpha'], estimatedDuration: 1, batchIndex: 1, retryCount: 0 },
  ],
  batches: [],
  currentBatchIndex: 0,
  parallelism: 2,
  logs: [{ timestamp: '2026-01-01T00:00:00Z', level: 'info', message: 'hello' }],
  conflicts: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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
  __resetStopTokenForTest();
  // useSSE 的 EventSource 单例跨测试存活,不重置 instances
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v, ok: true }) as Response;
    if (url.includes('/__apply-batch/approve') || url.includes('/__apply-batch/pause') || url.includes('/__apply-batch/resume') || url.includes('/__apply-batch/retry')) {
      return json(STATE);
    }
    if (url.includes('/__config')) return json({ stopToken: 'tok' });
    if (url.includes('/__apply-batch')) return json(STATE);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('apply-batch Workspace — 三视图与 URL', () => {
  it('?p=apply-batch 直开依赖图(默认视图)', async () => {
    setLocation('/?p=apply-batch');
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    expect(await screen.findByText('zapply batch')).toBeInTheDocument();
    expect(await screen.findByTestId('batch-view-graph')).toBeInTheDocument();
  });

  it('?p=apply-batch&view=approval 直开确认视图', async () => {
    setLocation('/?p=apply-batch&view=approval');
    render(<Workspace params={new URLSearchParams('?p=apply-batch&view=approval')} />);
    expect(await screen.findByTestId('batch-view-approval')).toBeInTheDocument();
  });

  it('点视图按钮 → URL view 更新', async () => {
    setLocation('/?p=apply-batch');
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    fireEvent.click(await screen.findByRole('button', { name: '进度' }));
    expect(new URLSearchParams(window.location.search).get('view')).toBe('checkpoint');
    expect(await screen.findByTestId('batch-view-checkpoint')).toBeInTheDocument();
  });
});

describe('apply-batch Workspace — SSE 替代轮询', () => {
  it('初始只拉一次数据,600ms 内无轮询请求', async () => {
    setLocation('/?p=apply-batch');
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    expect(await screen.findByText('zapply batch')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 600));
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/__apply-batch') && !String(c[0]).includes('/__apply-batch/'));
    expect(calls.length).toBe(1); // 无 2s 轮询
  });

  it('plugin:apply-batch:state SSE 事件到达 → 失效重取(store 变更 <1s UI 更新)', async () => {
    setLocation('/?p=apply-batch');
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    await screen.findByText('zapply batch');
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
    const before = fetchMock.mock.calls.filter((c) => String(c[0]) === '/__apply-batch').length;
    const es = FakeES.instances.at(-1)!;
    await act(async () => {
      es.emit('plugin:apply-batch:state', '');
    });
    await waitFor(() => {
      const after = fetchMock.mock.calls.filter((c) => String(c[0]) === '/__apply-batch').length;
      expect(after).toBeGreaterThan(before);
    });
  });
});

describe('apply-batch Workspace — 写操作鉴权与反馈', () => {
  it('写 POST 携带 /__config 返回的 stop-token(非空,等于服务端 token)', async () => {
    setLocation('/?p=apply-batch');
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    fireEvent.click(await screen.findByRole('button', { name: '暂停' }));
    await waitFor(() => {
      const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
      const post = fetchMock.mock.calls.find((c) => String(c[0]).includes('/__apply-batch/pause'));
      expect(post).toBeDefined();
      const headers = (post![1] as RequestInit).headers as Record<string, string>;
      expect(headers['x-stop-token']).toBe('tok');
    });
  });

  it('写 POST 非 2xx → 用户可见反馈(toast.error)', async () => {
    setLocation('/?p=apply-batch');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (v: unknown) => ({ json: async () => v, ok: true }) as Response;
      if (url.includes('/__config')) return json({ stopToken: 'tok' });
      if (init?.method === 'POST') return { ok: false, status: 500, json: async () => ({ error: 'internal' }) } as Response;
      if (url.includes('/__apply-batch')) return json(STATE);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    render(<Workspace params={new URLSearchParams('?p=apply-batch')} />);
    fireEvent.click(await screen.findByRole('button', { name: '暂停' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
