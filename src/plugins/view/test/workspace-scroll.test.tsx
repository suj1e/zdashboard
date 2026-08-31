/**
 * 数据新鲜度 T4:切文件后内容容器滚动位置重置为 0。
 * 长文件滚到中部再切短文件,不应停留在底部(此前 contentRef 恒不重置);
 * 实现约束:重置 scrollTop 而非 key 重挂 viewer(避免重复 fetch 闪屏)。
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

/** jsdom 无 IntersectionObserver(OutlineNav 滚动追踪用) */
class FakeIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async () =>
    ({ ok: true, text: async () => '# 文件内容' }) as unknown as Response
  ));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('view Workspace — 切文件滚动重置(数据新鲜度 T4)', () => {
  it('切文件后内容容器 scrollTop 重置为 0(viewer 不重挂)', async () => {
    setLocation('/?p=view&file=docs%2Flong.md');
    const params = (file: string) => new URLSearchParams(`?p=view&file=${encodeURIComponent(file)}`);
    const { rerender } = render(<Workspace params={params('docs/long.md')} />);
    const content = (await screen.findByText('文件内容')).closest('.overflow-auto') as HTMLElement;

    content.scrollTop = 500;
    expect(content.scrollTop).toBe(500);

    rerender(<Workspace params={params('docs/short.md')} />);
    // 旧容器节点 scrollTop 被原地置 0 ⇒ Workspace 未以 key 重挂内容区(重挂会换新节点,旧节点值不变)
    await waitFor(() => expect(content.scrollTop).toBe(0));
    expect(content.isConnected).toBe(true);
  });
});
