/**
 * T2 server 代理 + catalog 路由验收:
 * - GET /__market/proxy?url=:白名单外 403、白名单内透传 Content-Type、上游失败 502、
 *   缓存命中 X-Market-Cache: hit、TTL 过期回 miss、条目上限 ≤200 淘汰最旧、超时降级(fake timers);
 * - GET /__market/catalog/<market>:三市场形状、未知 market 404。
 * 取数分离:目录内置零 IO,代理经全局 fetch(测试桩注入)。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Writable } from 'node:stream';
import { createFakeCtx } from '../../../sdk/test/helpers.js';
import { ALLOWED_PROXY_HOSTS } from '../index.js';

/** 可承载异步 handler 的 res 桩(writeHead/end/headersSent 语义同 createRes,支持异步 await) */
type ProxyRes = Writable & {
  statusCode: number;
  headers?: Record<string, unknown>;
  bodyText(): string;
  headersSent: boolean;
  writableEnded: boolean;
};

function createProxyRes(): ProxyRes {
  const chunks: Buffer[] = [];
  let status = 0;
  let headers: Record<string, unknown> | undefined;
  let sent = false;
  let ended = false;
  const res = new Writable({
    write(chunk: Buffer, _enc, cb) { chunks.push(chunk); cb(); },
  }) as ProxyRes;
  Object.assign(res, {
    writeHead(s: number, h?: Record<string, unknown>) { status = s; headers = h; sent = true; return res; },
    end(body?: unknown) { ended = true; if (body != null) chunks.push(Buffer.from(String(body))); return res; },
    bodyText: () => Buffer.concat(chunks).toString('utf8'),
  });
  Object.defineProperty(res, 'statusCode', { get: () => status });
  Object.defineProperty(res, 'headers', { get: () => headers });
  Object.defineProperty(res, 'headersSent', { get: () => sent });
  Object.defineProperty(res, 'writableEnded', { get: () => ended });
  return res;
}

/** 上游响应桩(headers.get + text 异步) */
function upstreamMock(opts: { status?: number; contentType?: string; body?: string }) {
  const { status = 200, contentType = 'image/svg+xml', body = '<svg/>' } = opts;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  };
}

/**
 * 应用插件一次,返回与 core/server 同语义的路由查找:
 * 精确匹配优先,其次前缀匹配(rp + '/'),让 /__market/catalog/<market> 命中前缀路由。
 */
async function makeApp() {
  const { ctx, routes } = createFakeCtx();
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root: '/tmp/unused' });
  return (path: string) => {
    const exact = routes.get(path);
    if (exact) return exact;
    for (const [rp, handler] of routes) {
      if (path.startsWith(rp + '/')) return handler;
    }
    throw new Error(`route ${path} 未注册`);
  };
}

/** 单次独立插件实例的便捷版(无跨调用状态) */
async function setupRoute(path: string) {
  const find = await makeApp();
  return find(path);
}

/** 同一插件实例内多次调用代理(缓存语义需跨调用共享) */
async function makeProxyCaller(fetchMock?: unknown) {
  const find = await makeApp();
  const handler = find('/__market/proxy');
  if (fetchMock) vi.stubGlobal('fetch', fetchMock);
  return async (query: string) => {
    const req = { headers: {}, url: `/__market/proxy?${query}` } as never;
    const res = createProxyRes();
    await handler(req, res as never);
    return res;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('GET /__market/proxy — 安全白名单', () => {
  it('host 白名单常量恰为 cdn.jsdelivr.net 与 data.jsdelivr.com', () => {
    expect([...ALLOWED_PROXY_HOSTS].sort()).toEqual(['cdn.jsdelivr.net', 'data.jsdelivr.com']);
  });

  it('白名单外 host → 403,且不发起上游请求', async () => {
    const fetchMock = vi.fn();
    const call = await makeProxyCaller(fetchMock);
    for (const bad of [
      'https://evil.com/a.svg',
      'http://cdn.jsdelivr.net.evil.com/a.svg', // 伪装后缀
      'https://localhost/x',
    ]) {
      const res = await call('url=' + encodeURIComponent(bad));
      expect(res.statusCode, bad).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('缺参/非法 URL → 400,不发起上游请求', async () => {
    const fetchMock = vi.fn();
    const call = await makeProxyCaller(fetchMock);
    for (const q of ['', 'url=', 'url=%3A%2F%2Fbad']) {
      const res = await call(q);
      expect(res.statusCode, `query="${q}"`).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('GET /__market/proxy — 透传与缓存', () => {
  it('白名单内:200 + 透传上游 Content-Type + 正文,X-Market-Cache: miss', async () => {
    const fetchMock = vi.fn(async () => upstreamMock({ contentType: 'image/svg+xml', body: '<svg>ok</svg>' }));
    const call = await makeProxyCaller(fetchMock);
    const res = await call('url=' + encodeURIComponent('https://cdn.jsdelivr.net/npm/simple-icons@13/icons/react.svg'));
    expect(res.statusCode).toBe(200);
    expect(res.headers?.['Content-Type']).toBe('image/svg+xml');
    expect(res.headers?.['X-Market-Cache']).toBe('miss');
    expect(res.bodyText()).toBe('<svg>ok</svg>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('同 URL 第二次命中缓存:X-Market-Cache: hit,零上游请求', async () => {
    const fetchMock = vi.fn(async () => upstreamMock({ contentType: 'text/css', body: '.a{color:red}' }));
    const call = await makeProxyCaller(fetchMock);
    const url = 'url=' + encodeURIComponent('https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css');
    await call(url);
    const res2 = await call(url);
    expect(res2.statusCode).toBe(200);
    expect(res2.headers?.['X-Market-Cache']).toBe('hit');
    expect(res2.headers?.['Content-Type']).toBe('text/css');
    expect(res2.bodyText()).toBe('.a{color:red}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('不同 URL 不互相命中', async () => {
    const fetchMock = vi.fn(async () => upstreamMock({}));
    const call = await makeProxyCaller(fetchMock);
    await call('url=' + encodeURIComponent('https://cdn.jsdelivr.net/a.svg'));
    const res2 = await call('url=' + encodeURIComponent('https://cdn.jsdelivr.net/b.svg'));
    expect(res2.headers?.['X-Market-Cache']).toBe('miss');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('GET /__market/proxy — 降级', () => {
  it('上游非 2xx(500)→ 502', async () => {
    const fetchMock = vi.fn(async () => upstreamMock({ status: 500, body: 'boom' }));
    const call = await makeProxyCaller(fetchMock);
    const res = await call('url=' + encodeURIComponent('https://cdn.jsdelivr.net/x.svg'));
    expect(res.statusCode).toBe(502);
  });

  it('上游抛错(断网)→ 502', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('ECONNRESET'); });
    const call = await makeProxyCaller(fetchMock);
    const res = await call('url=' + encodeURIComponent('https://cdn.jsdelivr.net/x.svg'));
    expect(res.statusCode).toBe(502);
  });

  it('超时 8s → 中止上游并 502(fake timers)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    );
    const handler = await setupRoute('/__market/proxy');
    vi.stubGlobal('fetch', fetchMock);
    const req = { headers: {}, url: '/__market/proxy?url=' + encodeURIComponent('https://cdn.jsdelivr.net/slow.svg') } as never;
    const res = createProxyRes();
    const pending = handler(req, res as never);
    await vi.advanceTimersByTimeAsync(8000);
    await pending;
    expect(res.statusCode).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // 8s 内未到阈值不中止(刚发放超时定时器即中止语义正确性)
  });

  it('缓存条目上限 200:第 201 条挤掉最旧,再取最旧回 miss', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => upstreamMock({ body: `body-${String(input)}` }));
    const call = await makeProxyCaller(fetchMock);
    const base = 'https://data.jsdelivr.com/v1/bucket-';
    for (let i = 0; i < 200; i++) {
      await call('url=' + encodeURIComponent(`${base}${i}`));
    }
    expect(fetchMock).toHaveBeenCalledTimes(200);
    // 第 201 条触发淘汰
    await call('url=' + encodeURIComponent(`${base}200`));
    expect(fetchMock).toHaveBeenCalledTimes(201);
    // 最旧(第 0 条)已被挤出 → 重新 miss
    const again = await call('url=' + encodeURIComponent(`${base}0`));
    expect(again.headers?.['X-Market-Cache']).toBe('miss');
    expect(fetchMock).toHaveBeenCalledTimes(202);
    // 最新一条(200)仍在缓存 → hit
    const keep = await call('url=' + encodeURIComponent(`${base}200`));
    expect(keep.headers?.['X-Market-Cache']).toBe('hit');
    expect(fetchMock).toHaveBeenCalledTimes(202);
  });

  it('TTL 10min 过期后回 miss 并重新取数(fake timers)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => upstreamMock({ contentType: 'text/css', body: '.t{}' }));
    const handler = await setupRoute('/__market/proxy');
    vi.stubGlobal('fetch', fetchMock);
    const req = { headers: {}, url: '/__market/proxy?url=' + encodeURIComponent('https://cdn.jsdelivr.net/t.css') } as never;
    const res1 = createProxyRes();
    await handler(req, res1 as never);
    expect(res1.headers?.['X-Market-Cache']).toBe('miss');
    const res2 = createProxyRes();
    await handler(req, res2 as never);
    expect(res2.headers?.['X-Market-Cache']).toBe('hit');
    // 推进 10min + 1s
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1000);
    const res3 = createProxyRes();
    await handler(req, res3 as never);
    expect(res3.headers?.['X-Market-Cache']).toBe('miss');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('GET /__market/catalog/<market>', () => {
  it.each(['logos', 'motions', 'inspirations'])('%s → 200 entries 数组', async (market) => {
    const handler = await setupRoute(`/__market/catalog/${market}`);
    const req = { headers: {}, url: `/__market/catalog/${market}` } as never;
    const res = createProxyRes();
    await handler(req, res as never);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.bodyText()) as { entries: Array<Record<string, unknown>> };
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThan(0);
  });

  it('形状:logos 附 slug,motions 附 cls/lib,inspirations 附 url/tags', async () => {
    const handler = await setupRoute('/__market/catalog/logos');
    const call = async (market: string) => {
      const r = createProxyRes();
      await handler({ headers: {}, url: `/__market/catalog/${market}` } as never, r as never);
      return JSON.parse(r.bodyText()) as { entries: Array<Record<string, unknown>> };
    };
    const logos = await call('logos');
    expect(logos.entries[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), slug: expect.any(String) });
    const motions = await call('motions');
    expect(motions.entries[0]).toMatchObject({ id: expect.any(String), cls: expect.any(String), lib: expect.any(String) });
    const inspirations = await call('inspirations');
    expect(inspirations.entries[0]).toMatchObject({ id: expect.any(String), url: expect.any(String), tags: expect.anything() });
  });

  it('未知 market → 404', async () => {
    const handler = await setupRoute('/__market/catalog/unknown');
    const res = createProxyRes();
    await handler({ headers: {}, url: '/__market/catalog/unknown' } as never, res as never);
    expect(res.statusCode).toBe(404);
  });

  it('缺 market(裸路由)→ 404', async () => {
    const handler = await setupRoute('/__market/catalog');
    const res = createProxyRes();
    await handler({ headers: {}, url: '/__market/catalog' } as never, res as never);
    expect(res.statusCode).toBe(404);
  });
});
