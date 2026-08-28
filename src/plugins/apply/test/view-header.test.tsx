/**
 * 2026-08-28-apply-page-refactor T1 验收:ViewHeader 局部组件统一两 Tab 顶部。
 * - 两视图各渲染恰好一个 view-header,结构一致:包装类名全等(同 px/py)、
 *   同标题层级(单一 h3)、右侧操作槽位(view-header-actions)恒在;
 * - Workspace 壳面包屑(PageHeader)不动(由 workspace.test.tsx 覆盖,此处不重复)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';
import type { BatchSnapshot } from '../batch.js';
import type { ChangeSummary } from '../types.js';

// 全量并发下 lazy chunk 动态加载可能超过默认 1s,给异步查询 5s 余量
configure({ asyncUtilTimeout: 5000 });

const CHANGES: ChangeSummary[] = [
  { name: 'alpha', path: 'openspec/changes/alpha', total: 4, done: 1, hasProposal: false, hasDesign: false, inWorktree: false },
];

const BATCH: BatchSnapshot = {
  run: { id: 'run-1' },
  state: {
    version: '1', status: 'running',
    changes: [{ name: 'alpha', path: 'x', status: 'completed', priority: 1, risk: 'low', dependencies: [], estimatedDuration: 1, batchIndex: 0, retryCount: 0 }],
    batches: [{ index: 0, changeNames: ['alpha'], status: 'completed' }],
    currentBatchIndex: 0, parallelism: 2, logs: [], conflicts: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  } as never,
};

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v, ok: true }) as Response;
    if (url === '/__apply/batch/graph') return json({ changes: [], batches: [], conflicts: [] });
    if (url === '/__apply/batch/logs') return json([]);
    if (url === '/__apply/batch/plan') return { ok: false, status: 404, json: async () => ({ error: 'plan not found' }) } as Response;
    if (url === '/__apply/batch') return json(BATCH);
    if (url.startsWith('/__apply/change')) return json({ error: 'change not found' });
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

/** 渲染单视图 → 等 lazy 内容就绪 → 采集 view-header 结构 → 卸载(避免双树干扰) */
async function renderHeaderOf(view: 'single' | 'batch') {
  setLocation(`/?p=apply&view=${view}`);
  const rendered = render(<Workspace params={new URLSearchParams(`?p=apply&view=${view}`)} />);
  if (view === 'batch') await screen.findByTestId('batch-view');
  else await screen.findByText('alpha');
  const header = screen.getByTestId('view-header');
  const info = {
    className: header.className,
    h3Count: header.querySelectorAll('h3').length,
    h3Text: header.querySelector('h3')?.textContent ?? '',
    hasActionsSlot: header.querySelector('[data-testid="view-header-actions"]') !== null,
  };
  rendered.unmount();
  setLocation('/');
  return info;
}

describe('ViewHeader — 两 Tab 顶部结构一致', () => {
  it('single 与 batch 各渲染恰好一个 view-header,类名(px/py 等)与结构完全一致', async () => {
    const single = await renderHeaderOf('single');
    const batch = await renderHeaderOf('batch');
    expect(single.h3Count).toBe(1);
    expect(batch.h3Count).toBe(1);
    expect(single.hasActionsSlot).toBe(true);
    expect(batch.hasActionsSlot).toBe(true);
    // 同一组件形态:包装类名(px/py/边框等)全等
    expect(single.className).toBe(batch.className);
    expect(single.className).not.toBe('');
  });

  it('两 header 的 h3 标题非空,右侧操作槽位均存在', async () => {
    const single = await renderHeaderOf('single');
    const batch = await renderHeaderOf('batch');
    expect(single.h3Text.trim()).not.toBe('');
    expect(batch.h3Text.trim()).not.toBe('');
  });
});
