/**
 * T3 apply Workspace 迁移验收:
 * - change 入 URL:?p=apply&change=x 刷新直达详情;点卡片写回 URL;
 * - 任务树/进度条渲染;无 change 参数只显列表;无 change 空态 EmptyState。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { ChangeSummary, ChangeDetail } from '../types.js';

const CHANGES: ChangeSummary[] = [
  { name: 'alpha', path: 'openspec/changes/alpha', total: 4, done: 1, hasProposal: false, hasDesign: false, inWorktree: false },
  { name: 'beta', path: 'openspec/changes/beta', total: 2, done: 2, hasProposal: true, hasDesign: true, inWorktree: true },
];

const DETAIL: ChangeDetail = {
  ...CHANGES[0],
  tasks: '- [x] 已完成任务一\n- [ ] 待办任务二',
  dependsOn: [],
  hasTestStrategy: true,
};

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v }) as Response;
    if (url.includes('/__apply/change')) {
      const name = new URL(url, 'http://x').searchParams.get('name');
      if (name === 'alpha') return json(DETAIL);
      return json({ error: 'change not found' });
    }
    if (url.includes('/__apply')) return json(CHANGES);
    if (url.includes('/__worktrees')) return json([]);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('apply Workspace — change 入 URL', () => {
  it('?p=apply 渲染 change 卡片列表(含进度)', async () => {
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    expect(await screen.findByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getAllByText('1/4 · 25%').length).toBeGreaterThan(0);
  });

  it('?p=apply&change=alpha 刷新直达详情(任务树渲染)', async () => {
    render(<Workspace params={new URLSearchParams('?p=apply&change=alpha')} />);
    expect(await screen.findByText('已完成任务一')).toBeInTheDocument();
    expect(screen.getByText('待办任务二')).toBeInTheDocument();
  });

  it('点 beta 卡片 → URL change=beta', async () => {
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    fireEvent.click(await screen.findByText('beta'));
    expect(new URLSearchParams(window.location.search).get('change')).toBe('beta');
  });

  it('无 change 参数时不渲染详情区', async () => {
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    await screen.findByText('alpha');
    expect(screen.queryByText('已完成任务一')).not.toBeInTheDocument();
  });

  it('change 不存在(边界)→ 列表仍在且不崩溃', async () => {
    render(<Workspace params={new URLSearchParams('?p=apply&change=ghost')} />);
    expect(await screen.findByText('alpha')).toBeInTheDocument();
    expect(screen.queryByText('已完成任务一')).not.toBeInTheDocument();
  });
});

describe('apply Workspace — 空态', () => {
  it('无进行中 change → kit EmptyState', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__apply')) return ({ json: async () => [] }) as Response;
      if (url.includes('/__worktrees')) return ({ json: async () => [] }) as Response;
      throw new Error(`unexpected fetch: ${url}`);
    }));
    render(<Workspace params={new URLSearchParams('?p=apply')} />);
    expect(await screen.findByText('没有进行中的 change')).toBeInTheDocument();
  });
});
