/**
 * T5 灵感 Tab 验收:
 * - 标签过滤(tag pills 写回 URL q,q 同时匹配 name/desc/tags);
 * - 详情(?entry= 直达):元数据 + 新窗口打开原站(target/rel 语义);
 * - 转提示词:元数据模板 + 用户补充输入(空补充占位语义)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { useRoute, __resetRouterForTest } from '../../../web/router.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

const INSPIRATIONS = [
  { id: 'excalidraw', name: 'Excalidraw', desc: '手绘风协作白板', url: 'https://excalidraw.com', tags: ['白板', '手绘风'] },
  { id: 'tldraw', name: 'tldraw', desc: '无限画布 SDK', url: 'https://www.tldraw.com', tags: ['白板', '画布'] },
  { id: 'cal', name: 'Cal.com', desc: '开源日程预约', url: 'https://cal.com', tags: ['saas', '日程'] },
];

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

function Host() {
  const route = useRoute();
  return <Workspace params={route.params} />;
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__market/catalog/inspirations')) {
      return { ok: true, status: 200, json: async () => ({ entries: INSPIRATIONS }) } as unknown as Response;
    }
    return { ok: false, status: 404, json: async () => null } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('InspirationTab — 标签过滤', () => {
  it('点击标签 pill 过滤目录并写回 URL q', async () => {
    setLocation('/?p=market&tab=inspirations');
    render(<Host />);
    await screen.findByText('Cal.com');
    fireEvent.click(screen.getByRole('button', { name: '白板' }));
    expect(await screen.findByText('Excalidraw')).toBeInTheDocument();
    expect(screen.getByText('tldraw')).toBeInTheDocument();
    expect(screen.queryByText('Cal.com')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('q')).toBe('白板');
  });

  it('激活标签再点一次取消过滤(回全量)', async () => {
    setLocation('/?p=market&tab=inspirations&q=白板');
    render(<Host />);
    await screen.findByText('Excalidraw');
    expect(screen.queryByText('Cal.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '白板' }));
    expect(await screen.findByText('Cal.com')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('q')).toBeNull();
  });

  it('自由文本搜索同时匹配 name/desc/tags', async () => {
    setLocation('/?p=market&tab=inspirations');
    render(<Host />);
    await screen.findByText('Cal.com');
    fireEvent.change(screen.getByLabelText('搜索灵感'), { target: { value: '白板' } });
    expect(await screen.findByText('Excalidraw')).toBeInTheDocument();
    expect(screen.queryByText('Cal.com')).not.toBeInTheDocument();
  });

  it('无匹配显示空态', async () => {
    setLocation('/?p=market&tab=inspirations&q=不存在');
    render(<Host />);
    expect(await screen.findByText(/无匹配/)).toBeInTheDocument();
  });
});

describe('InspirationTab — 详情', () => {
  it('?entry= 直达:元数据 + 新窗口打开语义(target=_blank + noreferrer noopener)', async () => {
    setLocation('/?p=market&tab=inspirations&entry=excalidraw');
    render(<Host />);
    const link = (await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="inspiration-detail"] a');
      expect(el).not.toBeNull();
      return el as HTMLAnchorElement;
    }));
    expect(link.textContent).toContain('新窗口打开');
    expect(link.href).toBe('https://excalidraw.com/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noreferrer');
    expect(link.rel).toContain('noopener');
  });

  it('详情标签完整展示', async () => {
    setLocation('/?p=market&tab=inspirations&entry=excalidraw');
    render(<Host />);
    const detail = await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="inspiration-detail"]');
      expect(el?.textContent).toContain('手绘风');
      return el as Element;
    });
    expect(detail.textContent).toContain('白板');
  });
});

describe('InspirationTab — 转提示词(用户补充输入)', () => {
  it('模板含名称/URL/标签元数据', async () => {
    setLocation('/?p=market&tab=inspirations&entry=excalidraw');
    render(<Host />);
    const box = (await screen.findByLabelText('提示词')) as HTMLTextAreaElement;
    await vi.waitFor(() => expect(box.value).toContain('Excalidraw'));
    expect(box.value).toContain('https://excalidraw.com');
    expect(box.value).toContain('白板');
  });

  it('补充输入实时注入模板要求段', async () => {
    setLocation('/?p=market&tab=inspirations&entry=excalidraw');
    render(<Host />);
    const box = (await screen.findByLabelText('提示词')) as HTMLTextAreaElement;
    await vi.waitFor(() => expect(box.value).toContain('Excalidraw'));
    fireEvent.change(screen.getByLabelText('补充要求'), { target: { value: '暗色模式优先' } });
    await vi.waitFor(() => expect(box.value).toContain('暗色模式优先'));
    expect(box.value).toContain('要求 暗色模式优先');
  });

  it('补充为空 → 模板给占位语义不留空句', async () => {
    setLocation('/?p=market&tab=inspirations&entry=excalidraw');
    render(<Host />);
    const box = (await screen.findByLabelText('提示词')) as HTMLTextAreaElement;
    await vi.waitFor(() => expect(box.value).toContain('Excalidraw'));
    expect(box.value).toContain('无特殊要求');
  });
});
