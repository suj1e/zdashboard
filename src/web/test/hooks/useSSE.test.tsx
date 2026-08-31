/**
 * S1 回归:SSE 断线(EventSource 原生重连)恢复后必须触发一次静默数据刷新。
 *
 * 真 EventSource 断网后自动重连,onopen 会再次开火:此前 useSSE 的 onopen 先
 * setStatus('live') 再判 status==='lost',恒假 → 刷新死代码。本组用例以桩
 * EventSource 驱动 open→error→reconnect-open 全生命周期钉住该路径:
 * 恢复时逐订阅者回调 onFiles,且绝不整页 reload(onReload)。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSE, useSSEEvent } from '../../hooks/useSSE.js';
import { FakeES } from '../helpers/fake-es.js';

afterEach(() => { delete (globalThis as Record<string, unknown>).EventSource; });

describe('useSSE — 连接状态机', () => {
  it('首次连接 open 进入 live 且不触发刷新', () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const onFiles = vi.fn();
    const { result } = renderHook(() => useSSE(vi.fn(), onFiles));
    const es = FakeES.instances.at(-1)!;
    expect(es.url).toBe('/__reload');
    act(() => es.onopen?.());
    expect(result.current).toBe('live');
    // 正常首连不属于断线恢复
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('onerror 后状态置 lost', () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const { result } = renderHook(() => useSSE(vi.fn(), vi.fn()));
    const es = FakeES.instances.at(-1)!;
    act(() => es.onopen?.());
    act(() => es.onerror?.());
    expect(result.current).toBe('lost');
  });
});

describe('useSSE — 断线恢复刷新(S1)', () => {
  it('lost 后重连成功触发静默刷新 onFiles,不整页 reload', async () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const onReload = vi.fn();
    const onFiles = vi.fn();
    const { result } = renderHook(() => useSSE(onReload, onFiles));
    const es = FakeES.instances.at(-1)!;

    act(() => es.onopen?.());          // 建连 live
    expect(onFiles).not.toHaveBeenCalled();
    act(() => es.onerror?.());         // 断线 lost
    expect(result.current).toBe('lost');

    act(() => es.onopen?.());          // 原生重连再次 open
    await waitFor(() => {
      expect(result.current).toBe('live');
      expect(onFiles).toHaveBeenCalledTimes(1);
    });
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe('useSSE — 断线重连频道补偿(数据新鲜度 T1)', () => {
  it('断线期间注册的 useSSEEvent 频道,重连后 handler 被逐个补偿调用(data 为空串)', async () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const { result } = renderHook(() => useSSE(vi.fn(), vi.fn()));
    const es = FakeES.instances.at(-1)!;

    act(() => es.onopen?.());          // 建连 live
    act(() => es.onerror?.());         // 断线 lost
    // 断线期间注册的具名频道(真实场景:断网时用户停在插件页)
    renderHook(() => useSSEEvent('plugin:just:log', handlerA));
    renderHook(() => useSSEEvent('plugin:stats:refresh', handlerB));
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();

    act(() => es.onopen?.());          // 原生重连再次 open
    await waitFor(() => {
      expect(result.current).toBe('live');
      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerA).toHaveBeenCalledWith('');
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledWith('');
    });
  });

  it('首连 open(非断线恢复)不补偿已注册频道', () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const handler = vi.fn();
    renderHook(() => useSSE(vi.fn(), vi.fn()));
    renderHook(() => useSSEEvent('files', handler));
    const es = FakeES.instances.at(-1)!;
    act(() => es.onopen?.());          // 首次建连,无断线遗漏
    expect(handler).not.toHaveBeenCalled();
  });
});
