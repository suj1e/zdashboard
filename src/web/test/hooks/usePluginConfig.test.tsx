/**
 * usePluginConfig 验收:
 * - save POST 携带 /__config 返回的 stopToken(鉴权;meta[name=stop-token] 全仓无渲染,不可作为来源);
 * - 保存成功回写本地 config;加载合并 schema 默认值。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePluginConfig } from '../../hooks/usePluginConfig.js';
import { __resetStopTokenForTest } from '../../lib/stop-token.js';

const SCHEMA = {
  scanDirs: { type: 'string[]' as const, label: '扫描目录', default: [] },
};

function makeFetch(opts?: { postOk?: boolean }) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const json = (v: unknown) => ({ json: async () => v, ok: true }) as Response;
    if (url === '/__config') return json({ stopToken: 'tok-cfg' });
    if (url === '/__plugins/config' && init?.method === 'POST') {
      return opts?.postOk === false
        ? { ok: false, status: 403, json: async () => ({ error: 'forbidden' }) } as Response
        : json({ view: {} });
    }
    if (url === '/__plugins/config') return json({ view: { scanDirs: ['a'] } });
    throw new Error(`unexpected fetch: ${url}`);
  });
}

let fetchMock: ReturnType<typeof makeFetch>;

beforeEach(() => {
  __resetStopTokenForTest();
  fetchMock = makeFetch();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePluginConfig', () => {
  it('加载:合并插件已存值', async () => {
    const { result } = renderHook(() => usePluginConfig('view', SCHEMA));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config).toEqual({ scanDirs: ['a'] });
  });

  it('save POST 携带 /__config 的 stopToken 作为 X-Stop-Token(非空)', async () => {
    const { result } = renderHook(() => usePluginConfig('view', SCHEMA));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.save({ scanDirs: ['x'] }); });
    const post = fetchMock.mock.calls.find((c) => String(c[0]) === '/__plugins/config' && (c[1] as RequestInit | undefined)?.method === 'POST');
    expect(post).toBeDefined();
    const headers = (post![1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-Stop-Token']).toBe('tok-cfg');
    expect(headers['X-Stop-Token']).not.toBe('');
  });

  it('save 成功回写本地 config;失败(非 2xx)不回写', async () => {
    const { result } = renderHook(() => usePluginConfig('view', SCHEMA));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.save({ scanDirs: ['x'] }); });
    await waitFor(() => expect(result.current.config).toEqual({ scanDirs: ['x'] }));

    vi.stubGlobal('fetch', makeFetch({ postOk: false }));
    const { result: r2 } = renderHook(() => usePluginConfig('view', SCHEMA));
    await waitFor(() => expect(r2.current.loading).toBe(false));
    await act(async () => { await r2.current.save({ scanDirs: ['y'] }); });
    expect(r2.current.config).toEqual({ scanDirs: ['a'] }); // 失败不回写,保持已加载值
  });
});
