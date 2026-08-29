/**
 * T5 批量驾驶舱视图(只读)验收:
 * - 空态引导文案(无 run / run 存在但 state 缺失「历史 run 只读」);
 * - graph 批次分组渲染 + sel 入 URL;checkpoint 子视图切换(组件 state);
 * - 日志尾渲染;plan 只读展示(404 空态承接);
 * - 只读:无任何写控件(暂停/恢复/确认执行/重试);订阅 files 频道失效重取。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import BatchView from '../BatchView.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import { configure } from '@testing-library/react';

// 全量并发下 lazy chunk 动态加载可能超过默认 1s,给异步查询 5s 余量
configure({ asyncUtilTimeout: 5000 });
import type { BatchSnapshot } from '../batch.js';

const STATE = {
  version: '1',
  status: 'running',
  changes: [
    { name: 'alpha', path: 'x', status: 'completed', priority: 1, risk: 'low', dependencies: [], estimatedDuration: 1, batchIndex: 0, retryCount: 0 },
    { name: 'beta', path: 'y', status: 'running', priority: 2, risk: 'medium', dependencies: ['alpha'], estimatedDuration: 1, batchIndex: 1, retryCount: 0,
      checkpoint: { currentTaskIndex: 1, totalTasks: 2, completedTasks: 1, currentTask: '写实现' } },
    { name: 'gamma', path: 'z', status: 'parked', priority: 3, risk: 'high', dependencies: [], estimatedDuration: 1, batchIndex: 1, retryCount: 0 },
  ],
  batches: [
    { index: 0, changeNames: ['alpha'], status: 'completed' },
    { index: 1, changeNames: ['beta', 'gamma'], status: 'running' },
  ],
  currentBatchIndex: 1,
  parallelism: 3,
  logs: [
    { timestamp: '2026-01-01T00:00:01Z', level: 'info', message: '计划已生成' },
    { timestamp: '2026-01-01T00:00:02Z', level: 'success', message: 'alpha 完成', changeName: 'alpha' },
  ],
  conflicts: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:02Z',
};

const PLAN = '# 执行计划\n\n- 并行度 3\n';

const OK_SNAPSHOT: BatchSnapshot = { run: { id: 'run-1' }, state: STATE as never };
const NO_RUN: BatchSnapshot = { run: null, state: null };
const BROKEN_STATE: BatchSnapshot = { run: { id: 'run-1' }, state: null };

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

let batchPayload: BatchSnapshot;
let planStatus: number;
let batchFail: boolean;

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const u = new URL(url, 'http://x');
    const json = (v: unknown) => ({ json: async () => v, ok: true }) as Response;
    if (u.pathname === '/__apply/batch') {
      if (batchFail) throw new Error('network down');
      return json(batchPayload);
    }
    if (u.pathname === '/__apply/batch/graph') {
      // 与服务端 projectGraph 字段容忍一致:缺字段/非数组投影空数组
      const s = batchPayload.state as Record<string, unknown> | null;
      const changes = Array.isArray(s?.changes) ? (s!.changes as typeof STATE.changes) : [];
      return json({
        changes: changes.map((c) => ({ name: c.name, status: c.status, dependencies: c.dependencies, batchIndex: c.batchIndex })),
        batches: Array.isArray(s?.batches) ? s!.batches : [],
        conflicts: Array.isArray(s?.conflicts) ? s!.conflicts : [],
      });
    }
    if (u.pathname === '/__apply/batch/logs') {
      const s = batchPayload.state as Record<string, unknown> | null;
      return json(Array.isArray(s?.logs) ? s!.logs : []);
    }
    if (u.pathname === '/__apply/batch/plan') {
      return planStatus === 200 ? json({ plan: PLAN }) : { ok: false, status: 404, json: async () => ({ error: 'plan not found' }) } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  batchPayload = OK_SNAPSHOT;
  planStatus = 200;
  batchFail = false;
  stubFetch();
  vi.stubGlobal('EventSource', FakeES);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('BatchView — 空态引导(design 风险节文案)', () => {
  it('无 run → 空态引导:提示在 zapply batch 中启动 + 新约定路径说明(旧迁移文案已删)', async () => {
    batchPayload = NO_RUN;
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('暂无批量执行数据')).toBeInTheDocument();
    expect(screen.getByText(/zapply batch/)).toBeInTheDocument();
    expect(screen.getByText(/\.zdev\/apply\/runs\//)).toBeInTheDocument();
    // 旧 .zapply/batch-state.json 迁移提示行已删除,不再出现
    expect(screen.queryByText(/历史数据不迁移/)).not.toBeInTheDocument();
  });

  it('run 存在但 state 缺失/损坏 → 空态并注明历史 run 只读', async () => {
    batchPayload = BROKEN_STATE;
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('暂无批量执行数据')).toBeInTheDocument();
    expect(screen.getByText(/历史 run 只读/)).toBeInTheDocument();
  });

  it('数据加载失败(传输层)→ 与数据损坏分开文案,不误述为 run 损坏', async () => {
    batchFail = true;
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('暂无批量执行数据')).toBeInTheDocument();
    expect(screen.getByText(/数据加载失败/)).toBeInTheDocument();
    expect(screen.queryByText(/历史 run 只读/)).not.toBeInTheDocument();
  });
});

describe('BatchView — 只读驾驶舱渲染', () => {
  it('汇总条:并行度/运行中/失败/parked 计数(「成功」段与完成数重复,不再展示)', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('zapply batch')).toBeInTheDocument();
    expect(screen.getByText(/并行度:\s*3/)).toBeInTheDocument();
    expect(screen.getByText(/1 运行中/)).toBeInTheDocument();
    expect(screen.queryByText(/成功/)).not.toBeInTheDocument();
    expect(screen.getByText(/1 parked/)).toBeInTheDocument();
  });

  it('graph:批次分组渲染 change 名与状态,无写控件', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    // alpha 同时出现在侧栏列表与主图卡片(graph 双区渲染)
    expect((await screen.findAllByText('alpha')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('beta').length).toBeGreaterThanOrEqual(1);
    // 只读:写控件不存在
    expect(screen.queryByRole('button', { name: '暂停' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '恢复' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认执行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
  });

  it('点 change 卡片 → sel 入 URL;再点取消(sel 删键)', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    fireEvent.click((await screen.findAllByText('alpha'))[0]);
    expect(new URLSearchParams(window.location.search).get('sel')).toBe('alpha');
    fireEvent.click(screen.getAllByText('alpha')[0]);
    expect(new URLSearchParams(window.location.search).get('sel')).toBeNull();
  });

  it('checkpoint 子视图切换(组件 state,不占 URL view)并显示任务进度', async () => {
    setLocation('/?p=apply&view=batch&sel=beta');
    render(<BatchView />);
    fireEvent.click(await screen.findByRole('button', { name: '进度' }));
    expect(await screen.findByText('执行中的变更')).toBeInTheDocument();
    expect(screen.getByText('写实现')).toBeInTheDocument();
    // URL view 仍是 batch(未被内部子视图污染)
    expect(new URLSearchParams(window.location.search).get('view')).toBe('batch');
  });

  it('日志尾渲染 message 与 changeName 标注', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('计划已生成')).toBeInTheDocument();
    expect(screen.getByText('alpha 完成')).toBeInTheDocument();
    expect(screen.getByText('[alpha]')).toBeInTheDocument();
  });

  it('plan 只读展示:/__apply/batch/plan 内容渲染', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText(/并行度 3/)).toBeInTheDocument();
  });

  it('plan 缺失(404)→ 不渲染 plan 区,主视图不受影响', async () => {
    planStatus = 404;
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect((await screen.findAllByText('alpha')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('执行计划 plan.md(只读)')).not.toBeInTheDocument();
  });
});

describe('BatchView — files 频道刷新', () => {
  it('SSE files 事件到达 → 失效重取 /__apply/batch', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    await screen.findByText('zapply batch');
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
    const before = fetchMock.mock.calls.filter((c) => String(c[0]) === '/__apply/batch').length;
    const es = FakeES.instances.at(-1)!;
    await act(async () => {
      es.emit('files', '');
    });
    await waitFor(() => {
      const after = fetchMock.mock.calls.filter((c) => String(c[0]) === '/__apply/batch').length;
      expect(after).toBeGreaterThan(before);
    });
  });
});

describe('BatchView — 容器宽度(与 SingleChangeView 对称撑满)', () => {
  it('根容器无限宽类(无 mx-auto/max-w-6xl,h-full 撑满)', async () => {
    setLocation('/?p=apply&view=batch');
    const { container } = render(<BatchView />);
    await screen.findByText('zapply batch');
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('max-w-6xl');
    expect(root.className).not.toContain('mx-auto');
    expect(root.className).toContain('h-full');
  });
});

describe('BatchView — 多战线寻址(run query 透传 + front 展示,design ④)', () => {
  it('URL ?run= → 数据 fetch 携带 run query(路由链路送达)', async () => {
    setLocation('/?p=apply&view=batch&run=run-2');
    render(<BatchView />);
    await screen.findByText('zapply batch');
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
    expect(calls).toContain('/__apply/batch?run=run-2');
    expect(calls).toContain('/__apply/batch/graph?run=run-2');
    expect(calls).toContain('/__apply/batch/logs?run=run-2');
    expect(calls).toContain('/__apply/batch/plan?run=run-2');
  });

  it('无 run 参数 → fetch 不带 query(走 CURRENT)', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    await screen.findByText('zapply batch');
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
    expect(calls).toContain('/__apply/batch');
  });

  it('点 change 卡片 → sel 入 URL 且 run 参数保留(navigate patch 合并语义)', async () => {
    setLocation('/?p=apply&view=batch&run=run-2');
    render(<BatchView />);
    fireEvent.click((await screen.findAllByText('alpha'))[0]);
    const q = new URLSearchParams(window.location.search);
    expect(q.get('sel')).toBe('alpha');
    expect(q.get('run')).toBe('run-2');
  });

  it('state.front 非空 → 概览条渲染 front Chip(截断 + title,与 runId 并列)', async () => {
    batchPayload = { run: { id: 'run-1' }, state: { ...STATE, front: 'auth-重命名战线' } as never };
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    const overview = await screen.findByTestId('batch-overview');
    const chipText = within(overview).getByText('auth-重命名战线');
    expect(chipText).toHaveAttribute('title', 'auth-重命名战线');
    expect(chipText.closest('[data-slot="chip"]')).not.toBeNull();
    expect(within(overview).getByText(/run: run-1/)).toBeInTheDocument();
  });

  it('state.front 缺失/空字符串 → 不渲染 front Chip', async () => {
    batchPayload = { run: { id: 'run-1' }, state: { ...STATE, front: '' } as never };
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    const overview = await screen.findByTestId('batch-overview');
    expect(overview.querySelector('[data-slot="chip"]')).toBeNull();
  });
});

describe('BatchView — 三段分区(T3)', () => {
  it('概览条首屏元素:状态 Badge/批次 i/n/完成数/并发度/runId', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    await screen.findByText('zapply batch');
    const overview = screen.getByTestId('batch-overview');
    expect(within(overview).getByText('running')).toBeInTheDocument();
    expect(within(overview).getByText('第 2/2 批')).toBeInTheDocument();
    expect(within(overview).getByText('1/3 完成')).toBeInTheDocument();
    expect(within(overview).getByText(/并行度:\s*3/)).toBeInTheDocument();
    // S2:「n/n 完成」已表达完成数,「✅ n 成功」段删除,概览条不再出现「成功」
    expect(within(overview).queryByText(/成功/)).not.toBeInTheDocument();
    expect(within(overview).getByText(/run: run-1/)).toBeInTheDocument();
  });

  it('state.changes 缺失(外部写入防御)→ 概览条渲染 0 计数不崩', async () => {
    batchPayload = { run: { id: 'run-1' }, state: { ...STATE, changes: undefined } as never };
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    const overview = await screen.findByTestId('batch-overview');
    expect(within(overview).getByText('0/0 完成')).toBeInTheDocument();
    expect(within(overview).getByText(/0 运行中/)).toBeInTheDocument();
    expect(within(overview).getByText(/0 失败/)).toBeInTheDocument();
    expect(within(overview).getByText(/0 parked/)).toBeInTheDocument();
  });

  it('日志区固定高独立滚动容器(h-48 shrink-0 overflow-auto border-t)', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    await screen.findByText('zapply batch');
    const logs = screen.getByTestId('batch-logs');
    expect(logs.className).toContain('h-48');
    expect(logs.className).toContain('shrink-0');
    expect(logs.className).toContain('overflow-auto');
    expect(logs.className).toContain('border-t');
    // 日志内容仍在容器内
    expect(within(logs).getByText('计划已生成')).toBeInTheDocument();
  });

  it('plan 入口:概览条按钮默认展开 plan 区,点击可收起/再展开', async () => {
    setLocation('/?p=apply&view=batch');
    render(<BatchView />);
    expect(await screen.findByText('执行计划 plan.md(只读)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '执行计划' }));
    expect(screen.queryByText('执行计划 plan.md(只读)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '执行计划' }));
    expect(await screen.findByText('执行计划 plan.md(只读)')).toBeInTheDocument();
  });
});
