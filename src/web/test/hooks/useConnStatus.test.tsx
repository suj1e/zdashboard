/**
 * T2 useConnStatus 单源验收:Topbar/StatusBar 共用的连接状态钩子。
 * - 状态机与 useSSE 一致(connecting→live→lost);
 * - 可选 onFiles 透传:断线重连后触发一次静默刷新(StatusBar git 信息重取依赖)。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnStatus } from '../../hooks/useConnStatus.js';
import { FakeES } from '../helpers/fake-es.js';

afterEach(() => { delete (globalThis as Record<string, unknown>).EventSource; });

describe('useConnStatus — 连接状态单源', () => {
  it('connecting → open live → error lost 状态机', () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const { result } = renderHook(() => useConnStatus());
    expect(result.current).toBe('connecting');
    const es = FakeES.instances.at(-1)!;
    act(() => es.onopen?.());
    expect(result.current).toBe('live');
    act(() => es.onerror?.());
    expect(result.current).toBe('lost');
  });

  it('lost 后重连成功触发透传的 onFiles(静默刷新)', async () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const onFiles = vi.fn();
    const { result } = renderHook(() => useConnStatus(onFiles));
    const es = FakeES.instances.at(-1)!;
    act(() => es.onopen?.());
    act(() => es.onerror?.());
    act(() => es.onopen?.());
    await waitFor(() => {
      expect(result.current).toBe('live');
      expect(onFiles).toHaveBeenCalledTimes(1);
    });
  });
});
