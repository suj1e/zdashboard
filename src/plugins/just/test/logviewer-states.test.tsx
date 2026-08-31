/**
 * T2 LogViewer recipes 三态验收(仅 recipes 选择面,日志区交互不动):
 * - loading → Skeleton;mock 500 → ErrorState(onRetry=reload);空 → EmptyState 引导放置 justfile。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogViewer } from '../../../web/components/LogViewer.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

const RECIPES = [{ name: 'dev-server', description: 'dev' }];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}
function serverError(body: unknown) {
  return { ok: false, status: 500, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

/** jsdom 无 EventSource:LogViewer 的 /__just/logs 流用空壳桩顶住 */
class FakeES {
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
  set onopen(_f: unknown) {}
  set onmessage(_f: unknown) {}
  set onerror(_f: unknown) {}
}

beforeEach(() => {
  __resetPluginDataForTest();
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
    if (url.includes('/__just/recipes')) return okJson(RECIPES);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LogViewer — recipes 三态接线', () => {
  it('mock 500(/__just/recipes)→ ErrorState;点重试 → reload 重取成功后渲染任务卡', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (fail) return serverError({ error: 'recipes boom' });
      return okJson(RECIPES);
    }));
    render(<LogViewer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('recipes boom');

    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fail = false; // 服务恢复
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // dev-server 同时出现在药丸行与任务卡,findAll 断言恢复成功
    expect((await screen.findAllByText('dev-server')).length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('空 recipes → EmptyState 引导放置 justfile(不再是无引导的一句话)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (url.includes('/__just/recipes')) return okJson([]);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    render(<LogViewer />);
    expect(await screen.findByText('未发现 justfile recipes')).toBeInTheDocument();
    expect(screen.getByText(/在项目根目录放置 justfile/)).toBeInTheDocument();
  });

  it('loading(recipes 挂起)→ Skeleton 占位', () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      return new Promise<Response>(() => {});
    }));
    render(<LogViewer />);
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
