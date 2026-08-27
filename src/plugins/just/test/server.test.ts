/**
 * T5 just 插件 server 接线验收:
 * - definePlugin 接入;/__just/start|stop|restart|clear 走 guardedRoute(无 token 403);
 * - 新增 /__just/tasks 供活跃任务侧栏;SSE /__just/logs 保留;
 * - plugin:just:* 频道广播载荷携带 taskId(recipe)。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const children: Array<Record<string, unknown>> = [];
  return { children };
});

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  let pidSeq = 500;
  function makeChild(pid: number) {
    const child = new EventEmitter() as import("node:events").EventEmitter & Record<string, unknown>;
    child.pid = pid;
    child.killed = false;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => { child.killed = true; return true; };
    h.children.push(child);
    return child;
  }
  const cp = {
    spawn: vi.fn(() => makeChild(++pidSeq)),
    execFile: vi.fn((_f: string, _a: string[], _o: unknown, cb?: (err: unknown, stdout: string) => void) => {
      if (cb) cb(null, 'Available recipes:\nbuild  # build all\n');
      return { killed: false };
    }),
  };
  return { ...cp, default: cp };
});

import http from 'node:http';
import { createFakeCtx, createRes } from '../../../sdk/test/helpers.js';

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
  return req as unknown as http.IncomingMessage;
}

beforeEach(() => {
  h.children.length = 0;
});

/** guardedRoute 内部 void respondWith(...) fire-and-forget:断言前 flush 微任务 */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

async function setupPlugin(storedConfig: Record<string, unknown> = {}) {
  const { ctx, routes, sses, broadcasts } = createFakeCtx({ stopToken: 'tok-123', storedConfig });
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root: '/tmp/project' });
  return { ctx, routes, sses, broadcasts };
}

describe('just 插件 — 路由鉴权(guardedRoute)', () => {
  it.each(['/__just/start', '/__just/stop', '/__just/restart', '/__just/clear'])(
    'POST %s 无 token → 403', async (path) => {
      const { routes } = await setupPlugin();
      const res = createRes();
      routes.get(path)!(reqWithBody({}, {}), res as never);
      await flush();
      expect(res.statusCode).toBe(403);
    },
  );

  it('带合法 token start 已声明 recipe → 200 且任务 running', async () => {
    const { routes } = await setupPlugin();
    const res = createRes();
    routes.get('/__just/start')!(reqWithBody({ recipe: 'build' }, { 'x-stop-token': 'tok-123' }), res as never);
    await flush();
    expect(res.statusCode).toBe(200);
    const list = JSON.parse(String(res.body)) as Array<{ recipe: string; state: string }>;
    expect(list.some((t) => t.recipe === 'build' && t.state === 'running')).toBe(true);
  });

  it('start 未声明 recipe → 400;read 路由无需 token', async () => {
    const { routes } = await setupPlugin();
    const res = createRes();
    routes.get('/__just/start')!(reqWithBody({}, { 'x-stop-token': 'tok-123' }), res as never);
    await flush();
    expect(res.statusCode).toBe(400);

    const res2 = createRes();
    await routes.get('/__just/recipes')!({ headers: {} } as never, res2 as never);
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(String(res2.body))).toEqual([{ name: 'build', description: 'build all' }]);
  });
});

describe('just 插件 — /__just/tasks 与频道载荷', () => {
  it('新增 /__just/tasks 返回 runner.list()', async () => {
    const { routes } = await setupPlugin();
    routes.get('/__just/start')!(reqWithBody({ recipe: 'build' }, { 'x-stop-token': 'tok-123' }), createRes() as never);
    await flush();
    const res = createRes();
    routes.get('/__just/tasks')!({ headers: {} } as never, res as never);
    await flush();
    const tasks = JSON.parse(String(res.body)) as Array<{ recipe: string; state: string }>;
    expect(tasks).toEqual([expect.objectContaining({ recipe: 'build', state: 'running' })]);
  });

  it('子进程输出 → broadcast plugin:just:log 载荷携带 taskId(recipe)', async () => {
    const { routes, sses, broadcasts } = await setupPlugin();
    // runner.subscribe 在 SSE 客户端连接时才注册:先接一个假客户端
    const fakeClient = { write: () => {}, end: () => {} } as unknown as import('node:http').ServerResponse;
    (sses.get('/__just/logs') as unknown as (res: import('node:http').ServerResponse) => () => void)!(fakeClient);
    routes.get('/__just/start')!(reqWithBody({ recipe: 'build' }, { 'x-stop-token': 'tok-123' }), createRes() as never);
    await flush();
    const child = h.children.at(-1) as unknown as { stdout: import('node:events').EventEmitter };
    child.stdout.emit('data', Buffer.from('hello from build\n'));
    const logBroadcasts = broadcasts.filter((b) => b.event === 'plugin:just:log');
    expect(logBroadcasts.length).toBeGreaterThan(0);
    const payload = logBroadcasts.at(-1)!.data as { type: string; recipe: string; text: string };
    expect(payload.recipe).toBe('build');
    expect(payload.text).toBe('hello from build\n');
  });
});
