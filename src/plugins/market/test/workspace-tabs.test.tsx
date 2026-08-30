/**
 * T1 骨架验收:三 Tab 由 URL ?tab= 驱动。
 * - 缺省 tab=logos;点 Tab 写 URL 并清 q/entry(跨市场语义);
 * - 深链接 ?tab=motions&entry=… 直达详情;
 * - 目录经 /__market/catalog/<market> 加载(usePluginData)。
 * Host 组件模拟真实宿主(App.tsx):useRoute() → <Workspace params={route.params} />,路由变化重渲。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { useRoute, __resetRouterForTest } from '../../../web/router.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

/** 宿主等价物:App.tsx 以 useRoute().params 注入 Workspace */
function Host() {
  const route = useRoute();
  return <Workspace params={route.params} />;
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body =
      url.includes('/__market/catalog/logos')
        ? { entries: [{ id: 'react', name: 'React', category: 'dev' }, { id: 'vue', name: 'Vue', category: 'dev' }] }
        : url.includes('/__market/catalog/motions')
          ? { entries: [{ id: 'bounce', name: '弹跳', desc: '上下弹跳强调', cls: 'animate__bounce', lib: 'animate.css' }] }
          : url.includes('/__market/catalog/inspirations')
            ? { entries: [{ id: 'excalidraw', name: 'Excalidraw', desc: '手绘风白板', url: 'https://excalidraw.com', tags: ['白板'] }] }
            : null;
    return {
      ok: body !== null,
      status: body !== null ? 200 : 404,
      json: async () => body,
    } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('market Workspace — 三 Tab URL 驱动', () => {
  it('无 tab 参数缺省 logos,渲染 Logo 目录', async () => {
    setLocation('/?p=market');
    render(<Host />);
    expect((await screen.findAllByText('React')).length).toBeGreaterThan(0);
    expect(new URLSearchParams(window.location.search).get('tab') ?? 'logos').toBe('logos');
  });

  it('点击 Tab 写 URL 并清 q/entry,切换渲染对应市场', async () => {
    setLocation('/?p=market&tab=logos&q=rea&entry=react');
    render(<Host />);
    expect((await screen.findAllByText('React')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '动效' }));
    expect((await screen.findAllByText('弹跳')).length).toBeGreaterThan(0);
    const sp = new URLSearchParams(window.location.search);
    expect(sp.get('tab')).toBe('motions');
    expect(sp.get('q')).toBeNull();
    expect(sp.get('entry')).toBeNull();
  });

  it('?tab=inspirations 深链接直达灵感市场', async () => {
    setLocation('/?p=market&tab=inspirations');
    render(<Host />);
    expect((await screen.findAllByText('Excalidraw')).length).toBeGreaterThan(0);
  });

  it('?tab=motions&entry=bounce 直达详情', async () => {
    setLocation('/?p=market&tab=motions&entry=bounce');
    render(<Host />);
    expect((await screen.findAllByText('上下弹跳强调')).length).toBeGreaterThan(0);
  });
});
