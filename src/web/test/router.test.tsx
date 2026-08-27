import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoute, applyPatch, __resetRouterForTest } from '../router.js';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  vi.restoreAllMocks();
  __resetRouterForTest();
  setLocation('/');
});

describe('useRoute — 基础读取', () => {
  it('缺省 p=null,首页态', () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.plugin).toBeNull();
  });

  it('?p=view 读出 plugin=view 且暴露其余参数', () => {
    setLocation('/?p=view&wt=/tmp/repo');
    const { result } = renderHook(() => useRoute());
    expect(result.current.plugin).toBe('view');
    expect(result.current.params.get('wt')).toBe('/tmp/repo');
  });
});

describe('navigate — merge / null 删键', () => {
  it('合并新键且保留既有键与 p', () => {
    setLocation('/?p=view&wt=/a');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ file: 'openspec/x.md' }); });
    const q = new URLSearchParams(window.location.search);
    expect(q.get('p')).toBe('view');
    expect(q.get('wt')).toBe('/a');
    expect(q.get('file')).toBe('openspec/x.md');
    expect(result.current.params.get('file')).toBe('openspec/x.md');
  });

  it('patch 为 null 的键被删除', () => {
    setLocation('/?p=view&wt=/a&filter=auth');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ filter: null, wt: null }); });
    const q = new URLSearchParams(window.location.search);
    expect(q.has('wt')).toBe(false);
    expect(q.has('filter')).toBe(false);
    expect(q.get('p')).toBe('view');
  });

  it('patch 可改写 p 完成插件切换', () => {
    setLocation('/?p=view');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ p: 'stats' }); });
    expect(result.current.plugin).toBe('stats');
  });

  it('回首页:p 置 null 时键被整体移除', () => {
    setLocation('/?p=view&file=a.md');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ p: null }); });
    const q = new URLSearchParams(window.location.search);
    expect(q.has('p')).toBe(false);
    expect(result.current.plugin).toBeNull();
  });
});

describe('navigate — replace 语义', () => {
  it('默认 pushState,opts.replace 走 replaceState', () => {
    setLocation('/?p=view');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const repSpy = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ file: 'a' }); });
    act(() => { result.current.navigate({ file: 'b' }, { replace: true }); });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(repSpy).toHaveBeenCalledTimes(1);
  });

  it('结果与当前完全相同时不写历史', () => {
    setLocation('/?p=view&file=a');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useRoute());
    act(() => { result.current.navigate({ file: 'a' }); });
    expect(pushSpy).not.toHaveBeenCalled();
  });
});

describe('popstate 同步', () => {
  it('浏览器历史导航(popstate)后 hook 与地址栏一致', () => {
    setLocation('/?p=stats');
    const { result } = renderHook(() => useRoute());
    act(() => {
      window.history.pushState(null, '', '/?p=design&group=icon');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.plugin).toBe('design');
    expect(result.current.params.get('group')).toBe('icon');
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.plugin).toBeNull();
  });
});

describe('旧 #mode 深链接重定向', () => {
  it('#view 首次进入重定向为 ?p=view 并清空 hash', () => {
    setLocation('/#view');
    const { result } = renderHook(() => useRoute());
    expect(window.location.hash).toBe('');
    expect(new URLSearchParams(window.location.search).get('p')).toBe('view');
    expect(result.current.plugin).toBe('view');
  });

  it('#home 视为首页且不产生 p 键', () => {
    setLocation('/#home');
    const { result } = renderHook(() => useRoute());
    expect(window.location.hash).toBe('');
    expect(new URLSearchParams(window.location.search).has('p')).toBe(false);
    expect(result.current.plugin).toBeNull();
  });

  it('已有 ?p 时忽略旧 hash 不覆盖', () => {
    setLocation('/?p=stats#view');
    const { result } = renderHook(() => useRoute());
    expect(result.current.plugin).toBe('stats');
  });
});

describe('applyPatch — 纯函数语义', () => {
  it('merge/null 删键在字符串层面可复算', () => {
    expect(applyPatch('?p=view&wt=/a', { file: 'b' })).toBe('?p=view&wt=%2Fa&file=b');
    expect(applyPatch('?p=view&wt=/a', { wt: null })).toBe('?p=view');
    expect(applyPatch('', { p: 'just' })).toBe('?p=just');
  });
});
