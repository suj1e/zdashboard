/**
 * fetch 门卫单测:fetchJson/fetchText 四分支。
 * - 2xx 透传(JSON 解析 / 文本原样)
 * - 404 抛 HttpError 且带 status(「文件不存在」语义靠 status 区分)
 * - 500 抛 HttpError 并尝试读 body 的 error 字段作为 message
 * - 网络异常(fetch reject)原样传播
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJson, fetchText, HttpError } from '../fetchJson.js';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchJson — 2xx 透传', () => {
  it('200 返回解析后的 JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { tree: [1, 2] })));
    await expect(fetchJson('/x')).resolves.toEqual({ tree: [1, 2] });
  });

  it('init 透传给 fetch(method/headers)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchJson('/x', { method: 'POST', headers: { 'a': 'b' } });
    expect(fetchMock).toHaveBeenCalledWith('/x', { method: 'POST', headers: { 'a': 'b' } });
  });

  it('泛型 T 类型按声明返回(运行时透传)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, ['a'])));
    const out = await fetchJson<string[]>('/x');
    expect(out).toEqual(['a']);
  });
});

describe('fetchJson — 非 2xx 抛 HttpError', () => {
  it('404 抛 HttpError 且 status=404(无 error 字段时 message 含 status)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, 'not found')));
    const err = await fetchJson('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
    expect((err as HttpError).message).toContain('404');
  });

  it('500 读 body 的 error 字段作为 message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: 'boom' })));
    const err = await fetchJson('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(500);
    expect((err as HttpError).message).toBe('boom');
  });

  it('500 body 非 JSON(error 字段读不出)仍抛 HttpError 不二次炸', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('bad json'); },
      text: async () => '<html>bad gateway</html>',
    }) as unknown as Response));
    const err = await fetchJson('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(502);
  });

  it('HttpError 是 Error 子类', () => {
    expect(new HttpError(418, 'teapot')).toBeInstanceOf(Error);
    expect(new HttpError(418, 'teapot').status).toBe(418);
  });
});

describe('fetchJson — 网络异常', () => {
  it('fetch reject → 原样传播(非 HttpError)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(fetchJson('/x')).rejects.toThrow(TypeError);
  });
});

describe('fetchText — 2xx 透传 / 非 2xx 抛 HttpError', () => {
  it('200 返回文本原样', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, '# hello')));
    await expect(fetchText('/md')).resolves.toBe('# hello');
  });

  it('404 抛 HttpError status=404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, '')));
    const err = await fetchText('/md').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
  });

  it('500 抛 HttpError 并读 body error 字段', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: 'read fail' })));
    const err = await fetchText('/md').catch((e: unknown) => e);
    expect((err as HttpError).status).toBe(500);
    expect((err as HttpError).message).toBe('read fail');
  });

  it('网络异常原样传播', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    await expect(fetchText('/md')).rejects.toThrow(TypeError);
  });
});
