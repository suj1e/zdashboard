/**
 * T4 apply Workspace Tab 壳验收:
 * - 顶部 Tab「单 change｜批量驾驶舱」由 URL param view(single/batch,缺省 single)读写;
 * - 点 Tab 写 URL;深链接 ?p=apply&view=batch 直落批量 Tab;非法 view 回落 single。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { BatchSnapshot } from '../batch.js';

const CHANGES = [
  { name: 'alpha', path: 'openspec/changes/alpha', total: 4, done: 1, hasProposal: false, hasDesign: false, inWorktree: false },
];

const EMPTY_SNAPSHOT: BatchSnapshot = { run: null, state: null };

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

function stubFetch(opts?: { batch?: BatchSnapshot }) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v }) as Response;
    if (url.includes('/__worktrees')) return json([]);
    if (url.includes('/__apply/batch/graph')) return json({ changes: [], batches: [], conflicts: [] });
    if (url.includes('/__apply/batch/logs')) return json([]);
    if (url.includes('/__apply/batch/plan')) return { ok: false, status: 404, json: async () => ({ error: 'plan not found' }) } as Response;
    if (url.includes('/__apply/batch')) return json(opts?.batch ?? EMPTY_SNAPSHOT);
    if (url.includes('/__apply')) return json(CHANGES);
    throw new Error(`unexpected fetch: ${url}`);
  }));
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('apply Workspace — Tab 壳与 URL view param', () => {
  it('?p=apply 缺省落「单 change」Tab,渲染 Tab 条与 change 列表', async () => {
    setLocation('/?p=apply');
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    expect(await screen.findByRole('button', { name: '单 change' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量驾驶舱' })).toBeInTheDocument();
    expect(await screen.findByText('alpha')).toBeInTheDocument();
  });

  it('?p=apply&view=batch 深链接直落「批量驾驶舱」Tab', async () => {
    setLocation('/?p=apply&view=batch');
    render(<Workspace params={new URLSearchParams('?p=apply&view=batch')} />);
    expect(await screen.findByTestId('batch-view')).toBeInTheDocument();
    expect(screen.queryByText('已完成任务一')).not.toBeInTheDocument();
  });

  it('点「批量驾驶舱」→ URL view=batch 且切到批量内容', async () => {
    setLocation('/?p=apply');
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    fireEvent.click(await screen.findByRole('button', { name: '批量驾驶舱' }));
    expect(new URLSearchParams(window.location.search).get('view')).toBe('batch');
    expect(await screen.findByTestId('batch-view')).toBeInTheDocument();
  });

  it('批量 Tab 点「单 change」→ URL view=single 且回到 change 列表', async () => {
    setLocation('/?p=apply&view=batch');
    render(<Workspace params={new URLSearchParams('?p=apply&view=batch')} />);
    fireEvent.click(await screen.findByRole('button', { name: '单 change' }));
    expect(new URLSearchParams(window.location.search).get('view')).toBe('single');
    expect(await screen.findByText('alpha')).toBeInTheDocument();
  });

  it('非法 view 值(?p=apply&view=whatever)回落单 change Tab', async () => {
    setLocation('/?p=apply&view=whatever');
    render(<Workspace params={new URLSearchParams('?p=apply&view=whatever')} />);
    expect(await screen.findByText('alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('batch-view')).not.toBeInTheDocument();
  });
});
