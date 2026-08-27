/**
 * T6 apply-batch server 验收:
 * - 十条路由迁 SDK:读路由 route,写路由(approve/pause/resume/retry/adjust/reset/status)guardedRoute;
 * - 未带 token POST → 403;store 变更 → broadcast('state') 经 500ms 节流。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function makeRoot(stateFixture?: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-batch-'));
  if (stateFixture) {
    fs.mkdirSync(path.join(root, '.zapply'), { recursive: true });
    fs.writeFileSync(path.join(root, '.zapply', 'batch-state.json'), JSON.stringify(stateFixture));
  }
  return root;
}

const STATE = {
  version: '1',
  status: 'running',
  changes: [{ name: 'alpha', path: 'x', status: 'running', priority: 1, risk: 'low', dependencies: [], estimatedDuration: 1, batchIndex: 0, retryCount: 0 }],
  batches: [],
  currentBatchIndex: 0,
  parallelism: 2,
  logs: [],
  conflicts: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

async function setup(root: string) {
  const { ctx, routes, broadcasts } = await import('../../../sdk/test/helpers.js').then(m => m.createFakeCtx({ stopToken: 'tok-123' }));
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root });
  return { routes, broadcasts };
}

function reqWithBody(body: unknown, headers: Record<string, string> = {}) {
  const data = body == null ? '' : JSON.stringify(body);
  const req = {
    headers,
    url: '/x',
    on(event: string, cb: (chunk?: string) => void) {
      if (event === 'data' && data) cb(data);
      if (event === 'end') cb();
      return req;
    },
    resume() {},
  };
  return req as unknown as import('node:http').IncomingMessage;
}

/** 原样字符串体(用于非法 JSON 用例) */
function reqWithRaw(raw: string, headers: Record<string, string> = { 'x-stop-token': 'tok-123' }) {
  const req = {
    headers,
    url: '/x',
    on(event: string, cb: (chunk?: string) => void) {
      if (event === 'data' && raw) cb(raw);
      if (event === 'end') cb();
      return req;
    },
    resume() {},
  };
  return req as unknown as import('node:http').IncomingMessage;
}

function makeRes() {
  return { headersSent: false, statusCode: 0, headers: undefined as unknown, body: '' as unknown, writeHead(s: number, h?: unknown) { this.headersSent = true; this.statusCode = s; return this; }, end(b?: unknown) { this.body = b ?? ''; } } as import('node:http').ServerResponse & { body: unknown; statusCode: number };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('apply-batch 路由鉴权', () => {
  it.each(['/__apply-batch/approve', '/__apply-batch/pause', '/__apply-batch/resume', '/__apply-batch/retry', '/__apply-batch/adjust', '/__apply-batch/reset', '/__apply-batch/status'])(
    'POST %s 无 token → 403', async (path) => {
      const root = makeRoot(STATE);
      try {
        const { routes } = await setup(root);
        const res = { headersSent: false, statusCode: 0, headers: undefined as unknown, body: '' as unknown, writeHead(s: number) { this.headersSent = true; this.statusCode = s; return this; }, end(b?: unknown) { this.body = b ?? ''; } };
        routes.get(path)!(reqWithBody({}), res as never);
        await vi.advanceTimersByTimeAsync(0);
        expect(res.statusCode).toBe(403);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it('带 token POST /pause → 200 且状态变更广播 plugin:apply-batch:state', async () => {
    const root = makeRoot(STATE);
    try {
      const { routes, broadcasts } = await setup(root);
      const res = { headersSent: false, statusCode: 0, headers: undefined as unknown, body: '' as unknown, writeHead(s: number, h?: unknown) { this.headersSent = true; this.statusCode = s; return this; }, end(b?: unknown) { this.body = b ?? ''; } };
      routes.get('/__apply-batch/pause')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), res as never);
      await vi.advanceTimersByTimeAsync(0);
      expect(res.statusCode).toBe(200);

      // 节流:leading 立即一次
      vi.advanceTimersByTime(600);
      const stateEvents = broadcasts.filter((b) => b.event === 'plugin:apply-batch:state');
      expect(stateEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('读路由无需 token:/__apply-batch、changes、graph、logs', async () => {
    const root = makeRoot(STATE);
    try {
      const { routes } = await setup(root);
      for (const path of ['/__apply-batch', '/__apply-batch/changes', '/__apply-batch/graph', '/__apply-batch/logs']) {
        const res = { headersSent: false, statusCode: 0, headers: undefined as unknown, body: '' as unknown, writeHead(s: number) { this.headersSent = true; this.statusCode = s; return this; }, end(b?: unknown) { this.body = b ?? ''; } };
        routes.get(path)!({ headers: {} } as never, res as never);
        await vi.advanceTimersByTimeAsync(0);
        expect(res.statusCode, path).toBe(200);
        expect(String(res.body).length, path).toBeGreaterThan(0);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('连续 store 变更在 500ms 窗口内合并为一次尾补发', async () => {
    const root = makeRoot(STATE);
    try {
      const { routes, broadcasts } = await setup(root);
      const mk = () => ({ headersSent: false, statusCode: 0, headers: undefined as unknown, body: '' as unknown, writeHead(s: number) { this.headersSent = true; this.statusCode = s; return this; }, end(b?: unknown) { this.body = b ?? ''; } });
      routes.get('/__apply-batch/pause')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), mk() as never);
      await vi.advanceTimersByTimeAsync(0);
      routes.get('/__apply-batch/resume')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), mk() as never);
      await vi.advanceTimersByTimeAsync(0);
      routes.get('/__apply-batch/pause')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), mk() as never);
      await vi.advanceTimersByTimeAsync(0);

      expect(broadcasts.filter((b) => b.event === 'plugin:apply-batch:state')).toHaveLength(1); // leading
      vi.advanceTimersByTime(500);
      expect(broadcasts.filter((b) => b.event === 'plugin:apply-batch:state')).toHaveLength(2); // trailing 合并
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('apply-batch 写路由错误形状(与迁移前一致:400 + {error})', () => {
  it.each([
    ['/__apply-batch/status'],
    ['/__apply-batch/approve'],
    ['/__apply-batch/adjust'],
    ['/__apply-batch/retry'],
  ])('POST %s 非法 JSON → 400 + {error}(非 SDK 兜底 500 internal)', async (path) => {
    const root = makeRoot(STATE);
    try {
      const { routes } = await setup(root);
      const res = makeRes();
      routes.get(path)!(reqWithRaw('not-json{{'), res);
      await vi.advanceTimersByTimeAsync(0);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(String(res.body))).toHaveProperty('error');
      expect(JSON.parse(String(res.body)).error).not.toBe('internal');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('POST /__apply-batch/retry 缺 name → 400 + {error:"missing name"}', async () => {
    const root = makeRoot(STATE);
    try {
      const { routes } = await setup(root);
      const res = makeRes();
      routes.get('/__apply-batch/retry')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), res);
      await vi.advanceTimersByTimeAsync(0);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(String(res.body))).toEqual({ error: 'missing name' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('POST /__apply-batch/retry change 不存在 → 400 + {error:"change not found"}', async () => {
    const root = makeRoot(STATE);
    try {
      const { routes } = await setup(root);
      const res = makeRes();
      routes.get('/__apply-batch/retry')!(reqWithBody({ name: 'ghost' }, { 'x-stop-token': 'tok-123' }), res);
      await vi.advanceTimersByTimeAsync(0);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(String(res.body))).toEqual({ error: 'change not found' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
