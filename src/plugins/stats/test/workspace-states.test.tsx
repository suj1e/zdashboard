/**
 * T2 stats Workspace 三态验收:
 * - mock 500 → ErrorState(替代旧手写纯文本);重试 → reload 重新 fetch;
 * - loading → Skeleton(替代旧「加载中…」文本)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

const STATS = {
  root: 'zdashboard', files: 120, dirs: 30, totalSize: 1024 * 1024,
  byExt: [{ ext: '.ts', count: 60 }], markdown: 12,
  openspec: { active: 2, archived: 5 }, hasJust: true, worktrees: 3, branch: 'main', dirty: 4,
};
const DETECT = { hasOpenspec: true, hasDocs: true, hasJust: true };

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
  setLocation('/?p=stats');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('stats Workspace — 三态接线', () => {
  it('mock 500(/__stats/data)→ ErrorState 展示 body error;点重试 → reload 重取成功', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__detect')) return okJson(DETECT);
      if (fail) return serverError({ error: 'stats boom' });
      return okJson(STATS);
    }));
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('stats boom');

    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fail = false; // 服务恢复
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByText('.ts'); // Top10 渲染 = 恢复成功
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('loading(/__stats/data 挂起)→ Skeleton 占位,不再渲染「加载中…」纯文本', () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__detect')) return okJson(DETECT);
      return new Promise<Response>(() => {});
    }));
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByText('加载中…')).not.toBeInTheDocument();
  });

  it('detect 500 → 探测区显示「探测失败」,不与「justfile ✗」混同语义', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__detect')) return serverError({ error: 'detect boom' });
      return okJson(STATS);
    }));
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    expect(await screen.findByText(/探测失败/)).toBeInTheDocument();
    expect(screen.queryByText(/✗/)).not.toBeInTheDocument();
  });
});
