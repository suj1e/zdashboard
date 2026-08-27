import { describe, it, expect, vi } from 'vitest';
import { definePlugin, type PluginContext } from '../server.js';
import type { PluginManifest } from '../../core/manifest.js';
import { createFakeCtx, createRes } from './helpers.js';

const manifest: PluginManifest = {
  mode: 'mymode',
  label: 'My Mode',
  icon: '🧩',
  description: 'test plugin',
  config: {
    greeting: { type: 'string', label: 'Greeting', default: 'hello' },
    limit: { type: 'number', label: 'Limit', default: 10 },
  },
};

function reqWithHeaders(headers: Record<string, string> = {}) {
  return { headers } as unknown as import('node:http').IncomingMessage;
}

describe('definePlugin — cordis 插件对象形态', () => {
  it('返回 { inject, apply } 形态,inject 含 server/dashboard/reload', () => {
    const plugin = definePlugin({ manifest, setup() {} });
    expect(plugin.inject).toEqual(['server', 'dashboard', 'reload']);
    expect(typeof (plugin as { apply?: unknown }).apply).toBe('function');
  });

  it('apply 时向 dashboard 注册 manifest(单一来源)', () => {
    const { ctx, registered } = createFakeCtx();
    definePlugin({ manifest, setup() {} }).apply!(ctx as never, { root: '/tmp' });
    expect(ctx.dashboard.register).toHaveBeenCalledTimes(1);
    expect(registered[0]).toMatchObject({ mode: 'mymode', label: 'My Mode', icon: '🧩' });
  });

  it('setup 收到的 PluginContext.mode 与 manifest.mode 一致', () => {
    const { ctx } = createFakeCtx();
    let seenMode = '';
    definePlugin({ manifest, setup(p) { seenMode = p.mode; } }).apply!(ctx as never, {});
    expect(seenMode).toBe('mymode');
  });
});

describe('PluginContext.route — 自动 json 包装', () => {
  it('注册后 handler 返回值被包装为 200 + application/json + JSON body', async () => {
    const { ctx, routes } = createFakeCtx();
    const res = createRes();
    let ctxSeen: PluginContext | null = null;
    definePlugin({
      manifest,
      setup(p) {
        ctxSeen = p;
        p.route('/__mymode/items', () => ({ ok: true, n: 1 }));
      },
    }).apply!(ctx as never, {});

    expect(routes.has('/__mymode/items')).toBe(true);
    await routes.get('/__mymode/items')!(
      reqWithHeaders(), res as never,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headersSent).toBe(true);
    expect(String(res.headers?.['Content-Type'])).toContain('application/json');
    expect(JSON.parse(String(res.body))).toEqual({ ok: true, n: 1 });
  });

  it('异步 handler 的 Promise 返回值同样被 json 包装', async () => {
    const { ctx, routes } = createFakeCtx();
    const res = createRes();
    definePlugin({
      manifest,
      setup(p) { p.route('/__mymode/async', async () => ({ list: [1, 2] })); },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/async')!(reqWithHeaders(), res as never);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(String(res.body))).toEqual({ list: [1, 2] });
  });

  it('handler 自行写响应且无返回值时包装器不二次响应', async () => {
    const { ctx, routes } = createFakeCtx();
    const res = createRes();
    definePlugin({
      manifest,
      setup(p) {
        p.route('/__mymode/raw', (_req, r) => {
          r.writeHead(202, { 'Content-Type': 'text/plain' });
          r.end('manual');
        });
      },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/raw')!(reqWithHeaders(), res as never);
    expect(res.statusCode).toBe(202);
    expect(res.body).toBe('manual');
  });

  it('handler 抛错且未发头时回退 500 json,不崩进程', async () => {
    const { ctx, routes } = createFakeCtx();
    const res = createRes();
    definePlugin({
      manifest,
      setup(p) { p.route('/__mymode/boom', () => { throw new Error('boom'); }); },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/boom')!(reqWithHeaders(), res as never);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(String(res.body))).toHaveProperty('error');
  });
});

describe('PluginContext.guardedRoute — x-stop-token 校验', () => {
  it('缺 token → 403 且业务 handler 不执行', async () => {
    const { ctx, routes } = createFakeCtx({ stopToken: 'tok-123' });
    const res = createRes();
    const business = vi.fn(() => ({ ok: true }));
    definePlugin({
      manifest,
      setup(p) { p.guardedRoute('/__mymode/action', business); },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/action')!(reqWithHeaders(), res as never);
    expect(res.statusCode).toBe(403);
    expect(business).not.toHaveBeenCalled();
  });

  it('错 token → 403 且业务 handler 不执行', async () => {
    const { ctx, routes } = createFakeCtx({ stopToken: 'tok-123' });
    const res = createRes();
    const business = vi.fn(() => ({ ok: true }));
    definePlugin({
      manifest,
      setup(p) { p.guardedRoute('/__mymode/action', business); },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/action')!(reqWithHeaders({ 'x-stop-token': 'wrong' }), res as never);
    expect(res.statusCode).toBe(403);
    expect(business).not.toHaveBeenCalled();
  });

  it('正确 token → 放行且返回值 json 包装为 200', async () => {
    const { ctx, routes } = createFakeCtx({ stopToken: 'tok-123' });
    const res = createRes();
    definePlugin({
      manifest,
      setup(p) { p.guardedRoute('/__mymode/action', () => ({ done: true })); },
    }).apply!(ctx as never, {});
    await routes.get('/__mymode/action')!(reqWithHeaders({ 'x-stop-token': 'tok-123' }), res as never);
    expect(businessOk(res)).toBe(true);
    function businessOk(r: ReturnType<typeof createRes>) {
      return r.statusCode === 200 && JSON.parse(String(r.body)).done === true;
    }
  });
});

describe('PluginContext 其他通道', () => {
  it('sse/static 透传到 server 对应方法', () => {
    const { ctx, sses, statics } = createFakeCtx();
    definePlugin({
      manifest,
      setup(p) {
        p.sse('/__mymode/events', () => {});
        p.static(`${'/__plugin/mymode/'}`, '/some/dir');
      },
    }).apply!(ctx as never, {});
    expect(sses.has('/__mymode/events')).toBe(true);
    expect(statics.get('/__plugin/mymode/')).toBe('/some/dir');
  });

  it('broadcast(event,data) → reload 频道 plugin:<mode>:<event>', () => {
    const { ctx, broadcasts } = createFakeCtx();
    definePlugin({
      manifest,
      setup(p) { p.broadcast('finished', { id: 7 }); },
    }).apply!(ctx as never, {});
    expect(broadcasts[0]).toEqual({ event: 'plugin:mymode:finished', data: { id: 7 } });
  });

  it('config<T>() 合并 manifest 默认值与 .zdev 存储,存储优先', () => {
    const { ctx } = createFakeCtx({ storedConfig: { greeting: 'hi', extra: 'kept' } });
    let got: Record<string, unknown> | null = null;
    definePlugin({
      manifest,
      setup(p) { got = p.config<Record<string, unknown>>(); },
    }).apply!(ctx as never, {});
    expect(got!.greeting).toBe('hi');       // stored 覆盖 default
    expect(got!.limit).toBe(10);            // schema default
    expect(got!.extra).toBe('kept');        // 未声明的 stored 键保留
  });
});

describe('生命周期清理', () => {
  it('onDispose 注册的清理在 effect 卸载时触发', () => {
    const { ctx, cleanups } = createFakeCtx();
    const disposeA = vi.fn();
    definePlugin({
      manifest,
      setup(p) { p.onDispose(disposeA); },
    }).apply!(ctx as never, {});
    expect(cleanups.length).toBeGreaterThanOrEqual(1);
    for (const fn of cleanups) fn();
    expect(disposeA).toHaveBeenCalledTimes(1);
  });

  it('单个清理函数抛错不影响其余清理执行', () => {
    const { ctx, cleanups } = createFakeCtx();
    const disposeB = vi.fn();
    definePlugin({
      manifest,
      setup(p) {
        p.onDispose(() => { throw new Error('cleanup boom'); });
        p.onDispose(disposeB);
      },
    }).apply!(ctx as never, {});
    for (const fn of cleanups) fn();
    expect(disposeB).toHaveBeenCalled();
  });
});
