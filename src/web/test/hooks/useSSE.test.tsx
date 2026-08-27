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
import { useSSE } from '../../hooks/useSSE.js';

/** jsdom 无 EventSource;onopen/onerror 由用例手工开火模拟原生重连 */
class FakeES {
  static instances: FakeES[] = [];
  listeners = new Map<string, Set<(e: unknown) => void>>();
  closed = false;
  onopen?: () => void;
  onerror?: () => void;
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(name: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: unknown) => void) { this.listeners.get(name)?.delete(fn); }
  close() { this.closed = true; }
}

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
