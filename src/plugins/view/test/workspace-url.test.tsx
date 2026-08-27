/**
 * T2 view Workspace 深链接验收:?p=view&wt=…&file=… 刷新直达预览(无需侧栏点选)。
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__file-content')) {
      return { text: async () => '# 深链接预览内容' } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('view Workspace — 深链接直达', () => {
  it('?p=view&wt=…&file=… 直接渲染对应文件的查看器', async () => {
    setLocation('/?p=view&wt=%2Fwt%2Fa&file=docs%2Fguide.md');
    render(<Workspace params={new URLSearchParams('?p=view&wt=%2Fwt%2Fa&file=docs%2Fguide.md')} />);
    expect(await screen.findByText('深链接预览内容')).toBeInTheDocument();
    // 面包屑携带 worktree 与文件路径
    expect(screen.getByText(/\/wt\/a \/ docs\/guide\.md/)).toBeInTheDocument();
  });

  it('URL 无 file 时展示 kit 空态', () => {
    setLocation('/?p=view');
    render(<Workspace params={new URLSearchParams('?p=view')} />);
    expect(screen.getByText('从左侧选择文件预览')).toBeInTheDocument();
  });
});
