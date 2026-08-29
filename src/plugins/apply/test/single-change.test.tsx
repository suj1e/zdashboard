/**
 * zskills 新约定对齐:SingleChangeView 人工条目口径验收。
 * - 进度用新口径:total/done 剔除 🔧[人工] 项(全勾非人工时 100%);
 * - manual > 0 显示「待人工 x 项」徽标;
 * - 人工条目弱化样式(muted,保留 🔧[人工] 前缀文字),不作为「下一步」引导。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, configure, fireEvent, act } from '@testing-library/react';
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

describe('SingleChangeView — 容器宽度(与 BatchView 对称撑满)', () => {
  it('根容器去 mx-auto max-w-6xl(无限宽类,与 BatchView 同为 h-full 撑满)', async () => {
    setLocation('/?p=apply&change=alpha');
    const { container } = render(<SingleChangeView />);
    await screen.findByText('进行中的 change');
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).not.toContain('max-w-6xl');
    expect(root.className).not.toContain('mx-auto');
    expect(root.className).toContain('h-full');
    // 整个视图渲染树无任何限宽类
    expect(container.querySelector('.max-w-6xl')).toBeNull();
  });
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

  it('左列列表项显示 🔧[人工] 计数徽标(选中且详情已加载时)', async () => {
    setLocation('/?p=apply&change=alpha');
    render(<SingleChangeView />);
    expect(await screen.findByText('🔧[人工] 2')).toBeInTheDocument();
  });
});

describe('SingleChangeView — 选中切换瞬态(S1)', () => {
  const TWO_CHANGES: ChangeSummary[] = [
    { name: 'alpha', path: 'p/alpha', total: 2, done: 2, hasProposal: false, hasDesign: false, inWorktree: false },
    { name: 'beta', path: 'p/beta', total: 1, done: 0, hasProposal: false, hasDesign: false, inWorktree: false },
  ];
  // alpha:manual=2(与上方 DETAIL 同口径);beta:manual=0
  const ALPHA: ChangeDetail = {
    ...TWO_CHANGES[0],
    tasks: '- [x] 普通任务一\n- [x] 普通任务二\n- [ ] 🔧[人工] 人工确认部署\n- [x] 🔧[人工] 人工核对产物',
    dependsOn: [],
    hasTestStrategy: false,
  };
  const BETA: ChangeDetail = {
    ...TWO_CHANGES[1],
    tasks: '- [ ] beta 普通任务',
    dependsOn: [],
    hasTestStrategy: false,
  };

  /** beta 详情请求挂起(返回放行函数),alpha 详情/列表/worktrees 立即返回 */
  function stubDeferredBetaFetch(): (v: ChangeDetail) => void {
    let resolveBeta!: (v: ChangeDetail) => void;
    const pending = new Promise<ChangeDetail>((res) => { resolveBeta = res; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (v: unknown) => ({ json: async () => v }) as Response;
      if (url.includes('name=beta')) return pending.then(json);
      if (url.includes('/__apply/change')) return json(ALPHA);
      if (url.includes('/__apply')) return json(TWO_CHANGES);
      if (url.includes('/__worktrees')) return json([]);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    return resolveBeta;
  }

  it('切换选中项:beta 详情未返回前不串用 alpha 的 🔧[人工] 计数,右列出加载态', async () => {
    const resolveBeta = stubDeferredBetaFetch();
    setLocation('/?p=apply&change=alpha');
    render(<SingleChangeView />);
    // alpha 详情就绪:详情头与列表项均出现 manual=2
    expect(await screen.findByText('待人工 2 项')).toBeInTheDocument();
    expect(screen.getByText('🔧[人工] 2')).toBeInTheDocument();
    // 切到 beta(beta 详情挂起 → 瞬态窗口)
    fireEvent.click(screen.getByRole('button', { name: /beta/ }));
    // 身份守卫:瞬态期间 beta 不得短暂挂上 alpha 的计数(列表徽标与详情头)
    expect(screen.queryByText('🔧[人工] 2')).not.toBeInTheDocument();
    expect(screen.queryByText('待人工 2 项')).not.toBeInTheDocument();
    // 加载态替代误导空态;alpha 旧详情内容不得残留
    expect(screen.getByTestId('detail-loading')).toBeInTheDocument();
    expect(screen.queryByText('未选择 change')).not.toBeInTheDocument();
    expect(screen.queryByText('普通任务一')).not.toBeInTheDocument();
    // beta 详情返回 → 恢复渲染(manual=0 无徽标,计数已归零重载)
    await act(async () => { resolveBeta(BETA); });
    expect(await screen.findByText('beta 普通任务')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-loading')).not.toBeInTheDocument();
    expect(screen.queryByText('待人工 2 项')).not.toBeInTheDocument();
  });

  it('冷启动深链 ?change=beta:详情加载中渲染 Skeleton 而非「未选择 change」空态', async () => {
    const resolveBeta = stubDeferredBetaFetch();
    setLocation('/?p=apply&change=beta');
    render(<SingleChangeView />);
    // 列表先就绪(beta 项可见),详情仍挂起
    expect((await screen.findAllByText('beta')).length).toBeGreaterThan(0);
    expect(screen.queryByText('未选择 change')).not.toBeInTheDocument();
    expect(screen.getByTestId('detail-loading')).toBeInTheDocument();
    await act(async () => { resolveBeta(BETA); });
    expect(await screen.findByText('beta 普通任务')).toBeInTheDocument();
  });
});
