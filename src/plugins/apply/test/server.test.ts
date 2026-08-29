/**
 * T2 apply 批量只读路由验收(design.md 测试策略「集成」节 fixture 化):
 * - 4 条只读路由 /__apply/batch、/graph、/logs、/plan 返回约定形状(mock runs 三件套 + CURRENT);
 * - plan.md 缺失 → 404 + {error}(前端空态承接);无 CURRENT → 空投影不抛错;
 * - 批量只读:apply 插件注册的路由表零 /__apply-batch/* 写路由(7 条写路由已删)。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type http from 'node:http';
import type { BatchState } from '../batch.js';

const RUN_ID = 'run-fix-1';

const STATE: BatchState = {
  version: '1',
  status: 'running',
  changes: [
    { name: 'alpha', path: 'openspec/changes/alpha', status: 'completed', priority: 1, risk: 'low', dependencies: [], estimatedDuration: 5, batchIndex: 0, retryCount: 0 },
    { name: 'beta', path: 'openspec/changes/beta', status: 'running', priority: 2, risk: 'medium', dependencies: ['alpha'], estimatedDuration: 8, batchIndex: 1, retryCount: 0 },
  ],
  batches: [
    { index: 0, changeNames: ['alpha'], status: 'completed' },
    { index: 1, changeNames: ['beta'], status: 'running' },
  ],
  currentBatchIndex: 1,
  parallelism: 2,
  logs: [
    { timestamp: '2026-01-01T00:00:01Z', level: 'info', message: '计划已生成' },
    { timestamp: '2026-01-01T00:00:02Z', level: 'success', message: 'alpha 完成', changeName: 'alpha' },
    { timestamp: '2026-01-01T00:00:03Z', level: 'info', message: 'beta 执行中', changeName: 'beta' },
  ],
  conflicts: [{ changeA: 'alpha', changeB: 'beta', files: ['src/a.ts'], resolution: 'serialize' }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:03Z',
};

const PLAN_MD = '# 执行计划\n\n- 并行度 2\n- 批次 0: alpha\n- 批次 1: beta\n';

function makeRoot(withFixture: boolean, opts?: { withPlan?: boolean }): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-apply-routes-'));
  if (withFixture) {
    const runDir = path.join(root, '.zdev', 'apply', 'runs', RUN_ID);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'CURRENT'), RUN_ID);
    fs.writeFileSync(path.join(runDir, 'state.json'), JSON.stringify(STATE));
    if (opts?.withPlan !== false) fs.writeFileSync(path.join(runDir, 'plan.md'), PLAN_MD);
  }
  return root;
}

interface FakeRes {
  headersSent: boolean;
  statusCode: number;
  headers: Record<string, unknown> | undefined;
  body: string | Buffer | undefined;
  writeHead(status: number, headers?: Record<string, unknown>): unknown;
  end(b?: string | Buffer): void;
}

function makeRes(): FakeRes {
  return {
    headersSent: false,
    statusCode: 0,
    headers: undefined,
    body: undefined,
    writeHead(status, headers) { this.headersSent = true; this.statusCode = status; this.headers = headers; return this; },
    end(b) { this.body = b ?? ''; },
  };
}

async function setup(root: string) {
  const { createFakeCtx } = await import('../../../sdk/test/helpers.js');
  const { ctx, routes } = createFakeCtx();
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root });
  return routes;
}

async function callGet(routes: Map<string, (req: http.IncomingMessage, res: http.ServerResponse) => void>, path: string) {
  // 路由表按 pathname 注册;query(如 ?run=)仅透传给 handler 的 req.url
  const pathname = path.split('?')[0]!;
  const handler = routes.get(pathname);
  const res = makeRes();
  if (!handler) return { registered: false as const, res };
  await handler({ headers: {}, url: path } as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  return { registered: true as const, res };
}

function jsonBody(res: FakeRes): any {
  return JSON.parse(String(res.body));
}

let root: string;
beforeEach(() => { root = makeRoot(true); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('GET /__apply/batch* 只读路由(mock runs fixture)', () => {
  it('/__apply/batch → { run:{id}, state:全量 BatchState }', async () => {
    const routes = await setup(root);
    const { registered, res } = await callGet(routes, '/__apply/batch');
    expect(registered).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual({ run: { id: RUN_ID }, state: STATE });
  });

  it('/__apply/batch/graph → 投影形状(changes 投影 + batches/conflicts 原样)', async () => {
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch/graph');
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual({
      changes: [
        { name: 'alpha', status: 'completed', dependencies: [], batchIndex: 0 },
        { name: 'beta', status: 'running', dependencies: ['alpha'], batchIndex: 1 },
      ],
      batches: STATE.batches,
      conflicts: STATE.conflicts,
    });
  });

  it('/__apply/batch/logs → state.logs(尾窗),含 changeName 字段', async () => {
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch/logs');
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual(STATE.logs);
  });

  it('/__apply/batch/plan → plan.md 文本', async () => {
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch/plan');
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual({ plan: PLAN_MD });
  });

  it('plan.md 缺失 → 404 + {error}(前端空态承接)', async () => {
    fs.rmSync(root, { recursive: true, force: true });
    root = makeRoot(true, { withPlan: false });
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch/plan');
    expect(res.statusCode).toBe(404);
    expect(jsonBody(res)).toHaveProperty('error');
  });

  it('state.json 为合法 JSON 但非对象 → 空投影空日志,路由不 500', async () => {
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', RUN_ID, 'state.json'), '[1,2]');
    const routes = await setup(root);
    const batch = await callGet(routes, '/__apply/batch');
    expect(batch.res.statusCode).toBe(200);
    expect(jsonBody(batch.res)).toEqual({ run: { id: RUN_ID }, state: null });
    const graph = await callGet(routes, '/__apply/batch/graph');
    expect(graph.res.statusCode).toBe(200);
    expect(jsonBody(graph.res)).toEqual({ changes: [], batches: [], conflicts: [] });
    const logs = await callGet(routes, '/__apply/batch/logs');
    expect(logs.res.statusCode).toBe(200);
    expect(jsonBody(logs.res)).toEqual([]);
  });

  it('log 尾窗超过 100 条 → 只回最近 100 条(边界)', async () => {
    const big: BatchState = {
      ...STATE,
      logs: Array.from({ length: 150 }, (_, i) => ({ timestamp: `2026-01-01T00:${String(i % 60).padStart(2, '0')}:00Z`, level: 'info' as const, message: `log ${i}` })),
    };
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', RUN_ID, 'state.json'), JSON.stringify(big));
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch/logs');
    const logs = jsonBody(res);
    expect(logs).toHaveLength(100);
    expect(logs.at(-1).message).toBe('log 149');
  });
});

describe('显式 run 寻址(query.run 透传,design ④)', () => {
  const OTHER_ID = 'run-other';
  const OTHER_STATE: BatchState = { ...STATE, status: 'paused', currentBatchIndex: 0 };
  const OTHER_PLAN = '# run-other 执行计划\n';

  function writeRun(runId: string, opts?: { withPlan?: boolean; state?: unknown }): void {
    const runDir = path.join(root, '.zdev', 'apply', 'runs', runId);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'state.json'), JSON.stringify(opts?.state ?? OTHER_STATE));
    if (opts?.withPlan !== false) fs.writeFileSync(path.join(runDir, 'plan.md'), OTHER_PLAN);
  }

  it('/__apply/batch?run=<合法> → 读对应 run 的 state(忽略 CURRENT)', async () => {
    writeRun(OTHER_ID);
    const routes = await setup(root);
    const { res } = await callGet(routes, `/__apply/batch?run=${OTHER_ID}`);
    expect(jsonBody(res)).toEqual({ run: { id: OTHER_ID }, state: OTHER_STATE });
  });

  it('/__apply/batch/graph?run=<合法> → 对应 run 的投影', async () => {
    writeRun(OTHER_ID);
    const routes = await setup(root);
    const { res } = await callGet(routes, `/__apply/batch/graph?run=${OTHER_ID}`);
    expect(jsonBody(res)).toEqual({
      changes: expect.any(Array),
      batches: OTHER_STATE.batches,
      conflicts: OTHER_STATE.conflicts,
    });
  });

  it('/__apply/batch/logs?run=<合法> → 对应 run 的日志', async () => {
    writeRun(OTHER_ID, { state: { ...STATE, logs: [{ timestamp: 't', level: 'info', message: 'other log' }] } });
    const routes = await setup(root);
    const { res } = await callGet(routes, `/__apply/batch/logs?run=${OTHER_ID}`);
    expect(jsonBody(res)).toEqual([{ timestamp: 't', level: 'info', message: 'other log' }]);
  });

  it('/__apply/batch/plan?run=<合法> → 对应 run 的 plan.md', async () => {
    writeRun(OTHER_ID);
    const routes = await setup(root);
    const { res } = await callGet(routes, `/__apply/batch/plan?run=${OTHER_ID}`);
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual({ plan: OTHER_PLAN });
  });

  it('?run=<非法> → 忽略回退 CURRENT(与 readBatchState 同 pattern)', async () => {
    writeRun(OTHER_ID);
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch?run=../evil');
    expect(jsonBody(res)).toEqual({ run: { id: RUN_ID }, state: STATE });
  });

  it('?run=<合法但缺失> → { run:{id}, state:null };plan → 404', async () => {
    writeRun(OTHER_ID);
    const routes = await setup(root);
    const batch = await callGet(routes, '/__apply/batch?run=ghost-run');
    expect(jsonBody(batch.res)).toEqual({ run: { id: 'ghost-run' }, state: null });
    const plan = await callGet(routes, '/__apply/batch/plan?run=ghost-run');
    expect(plan.res.statusCode).toBe(404);
    expect(jsonBody(plan.res)).toHaveProperty('error');
  });

  it('无 run 参数 → 走 CURRENT(既有语义)', async () => {
    const routes = await setup(root);
    const { res } = await callGet(routes, '/__apply/batch');
    expect(jsonBody(res)).toEqual({ run: { id: RUN_ID }, state: STATE });
  });
});

describe('空态语义(无 CURRENT / 数据缺失不抛错)', () => {
  it('无 CURRENT → /__apply/batch 空快照;graph/logs 空投影;plan 404', async () => {
    fs.rmSync(root, { recursive: true, force: true });
    root = makeRoot(false);
    const routes = await setup(root);
    const batch = await callGet(routes, '/__apply/batch');
    expect(jsonBody(batch.res)).toEqual({ run: null, state: null });
    const graph = await callGet(routes, '/__apply/batch/graph');
    expect(jsonBody(graph.res)).toEqual({ changes: [], batches: [], conflicts: [] });
    const logs = await callGet(routes, '/__apply/batch/logs');
    expect(jsonBody(logs.res)).toEqual([]);
    const plan = await callGet(routes, '/__apply/batch/plan');
    expect(plan.res.statusCode).toBe(404);
  });
});

describe('批量只读(写路由删除)', () => {
  it('apply 插件路由表零 /__apply-batch/* 条目,7 条写路由不存在', async () => {
    const routes = await setup(root);
    const paths = [...routes.keys()];
    expect(paths.filter((p) => p.startsWith('/__apply-batch'))).toEqual([]);
    for (const writePath of ['/__apply-batch/status', '/__apply-batch/approve', '/__apply-batch/adjust', '/__apply-batch/retry', '/__apply-batch/pause', '/__apply-batch/resume', '/__apply-batch/reset']) {
      expect(paths, writePath).not.toContain(writePath);
    }
  });

  it('apply 插件注册的路由集合恰为 6 条只读(2 单 change + 4 批量)', async () => {
    const routes = await setup(root);
    expect([...routes.keys()].sort()).toEqual([
      '/__apply',
      '/__apply/batch',
      '/__apply/batch/graph',
      '/__apply/batch/logs',
      '/__apply/batch/plan',
      '/__apply/change',
    ]);
  });
});
