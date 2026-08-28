/**
 * zskills 新约定对齐:SingleChangeView 人工条目口径验收。
 * - 进度用新口径:total/done 剔除 🔧[人工] 项(全勾非人工时 100%);
 * - manual > 0 显示「待人工 x 项」徽标;
 * - 人工条目弱化样式(muted,保留 🔧[人工] 前缀文字),不作为「下一步」引导。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import SingleChangeView from '../SingleChangeView.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { ChangeSummary, ChangeDetail } from '../types.js';

// 全量并发下异步查询给 5s 余量(与同目录其他组件测试一致)
configure({ asyncUtilTimeout: 5000 });

// 新口径 summary:total/done 仅统计非人工项(2 项全勾)
const CHANGES: ChangeSummary[] = [
  { name: 'alpha', path: 'openspec/changes/alpha', total: 2, done: 2, hasProposal: false, hasDesign: false, inWorktree: false },
];

const DETAIL: ChangeDetail = {
  ...CHANGES[0],
  tasks: '- [x] 普通任务一\n- [x] 普通任务二\n- [ ] 🔧[人工] 人工确认部署\n- [x] 🔧[人工] 人工核对产物',
  dependsOn: [],
  hasTestStrategy: false,
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
    if (url.includes('/__apply/change')) return json(DETAIL);
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

describe('SingleChangeView — 🔧[人工] 口径', () => {
  it('manual > 0 显示「待人工 x 项」徽标,进度 100%(全勾非人工时)', async () => {
    setLocation('/?p=apply&change=alpha');
    render(<SingleChangeView />);
    expect(await screen.findByText('待人工 2 项')).toBeInTheDocument();
    expect(screen.getAllByText('2/2 · 100%').length).toBeGreaterThan(0);
  });

  it('人工条目弱化(muted)且保留 🔧[人工] 前缀文字;非人工勾选项维持正常色', async () => {
    setLocation('/?p=apply&change=alpha');
    render(<SingleChangeView />);
    const manualItem = await screen.findByText('🔧[人工] 人工确认部署');
    expect(manualItem).toBeInTheDocument();
    expect(manualItem.closest('li')).toHaveClass('text-muted-foreground');
    const normalItem = screen.getByText('普通任务一');
    expect(normalItem.closest('li')).toHaveClass('text-foreground');
  });

  it('人工条目不作为「下一步」引导;tasks 计数用新口径(不含人工)', async () => {
    setLocation('/?p=apply&change=alpha');
    render(<SingleChangeView />);
    await screen.findByText('🔧[人工] 人工确认部署');
    // 唯一未勾项是人工项 → 不显示下一步引导
    expect(screen.queryByText('← 下一步')).not.toBeInTheDocument();
    // tasks.md 标题计数 = 非人工项数(2),而非原始 4
    expect(screen.getByText('(2 项)')).toBeInTheDocument();
  });
});
