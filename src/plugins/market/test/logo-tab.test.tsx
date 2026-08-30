/**
 * T3 Logo Tab 验收:
 * - 前端搜索过滤(q URL 驱动,输入即写回 URL;无结果 EmptyState);
 * - 详情渲染:?entry= 直达 → 大图(代理 URL)+ SVG 源码(CodeViewer)+ 转提示词模板;
 * - proxy 失败降级:网格缩略图占位、详情大图失败重试、源码加载失败错误态。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { useRoute, __resetRouterForTest } from '../../../web/router.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>React</title><path d="M14.23"/></svg>';

const LOGOS = [
  { id: 'react', name: 'React', category: 'dev' },
  { id: 'vite', name: 'Vite', category: 'dev' },
  { id: 'vuedotjs', name: 'Vue.js', category: 'dev' },
  { id: 'figma', name: 'Figma', category: 'design' },
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
    if (url.includes('/__market/catalog/logos')) {
      return { ok: true, status: 200, json: async () => ({ entries: LOGOS }) } as unknown as Response;
    }
    if (url.includes('/__market/proxy')) {
      const target = new URL(url, 'http://localhost').searchParams.get('url') ?? '';
      if (target.includes('/vite.svg')) {
        return { ok: false, status: 502, text: async () => 'upstream error' } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => SVG } as unknown as Response;
    }
    return { ok: false, status: 404, json: async () => null } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('LogoTab — 前端搜索过滤', () => {
  it('输入搜索词过滤 name/slug,并写回 URL q', async () => {
    setLocation('/?p=market&tab=logos');
    render(<Host />);
    await screen.findByText('Figma');
    expect(screen.getByText('React')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('搜索 Logo'), { target: { value: 'vue' } });
    expect(await screen.findByText('Vue.js')).toBeInTheDocument();
    expect(screen.queryByText('Figma')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('q')).toBe('vue');
  });

  it('URL ?q= 深链接直接过滤(slug 匹配)', async () => {
    setLocation('/?p=market&tab=logos&q=vit');
    render(<Host />);
    expect(await screen.findByText('Vite')).toBeInTheDocument();
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('Vue.js')).not.toBeInTheDocument();
  });

  it('无匹配结果显示空态(非空白)', async () => {
    setLocation('/?p=market&tab=logos&q=不存在的品牌');
    render(<Host />);
    expect(await screen.findByText(/无匹配/)).toBeInTheDocument();
  });
});

describe('LogoTab — 详情渲染(?entry= 直达)', () => {
  it('大图经代理加载,src 为 simple-icons 代理 URL', async () => {
    setLocation('/?p=market&tab=logos&entry=react');
    render(<Host />);
    const img = (await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="logo-detail-img"]') as HTMLImageElement | null;
      expect(el).not.toBeNull();
      return el as HTMLImageElement;
    }));
    expect(img.src).toContain('/__market/proxy?url=');
    expect(decodeURIComponent(img.src)).toContain('https://cdn.jsdelivr.net/npm/simple-icons@13/icons/react.svg');
    // 风格特征事实注入
    expect(screen.getByText('单色')).toBeInTheDocument();
    expect(screen.getByText('24×24 viewBox')).toBeInTheDocument();
  });

  it('SVG 源码经 CodeViewer 展示(代理拉取原文)', async () => {
    setLocation('/?p=market&tab=logos&entry=react');
    render(<Host />);
    const code = await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="logo-source"] code');
      expect(el?.textContent).toContain('viewBox');
      return el as Element;
    });
    expect(code.textContent).toContain('<path');
  });

  it('转提示词:模板含品牌名插值与商标合规红线,可编辑', async () => {
    setLocation('/?p=market&tab=logos&entry=react');
    render(<Host />);
    const box = (await screen.findByLabelText('提示词')) as HTMLTextAreaElement;
    await vi.waitFor(() => expect(box.value).toContain('React'));
    expect(box.value).toContain('仅风格参考,不得复制商标');
    fireEvent.change(box, { target: { value: '改后的提示词' } });
    expect(box.value).toBe('改后的提示词');
  });

  it('再次点击选中项/清除选中回到网格', async () => {
    setLocation('/?p=market&tab=logos&entry=react');
    render(<Host />);
    await vi.waitFor(() => expect(document.querySelector('[data-slot="logo-detail-img"]')).not.toBeNull());
    // entry 深链接下点击选中卡片 = 取消选中(点卡片按钮,非详情文本)
    const card = document.querySelector('[data-slot="logo-card"]') as HTMLButtonElement | null;
    expect(card).not.toBeNull();
    fireEvent.click(card as Element);
    await vi.waitFor(() => expect(new URLSearchParams(window.location.search).get('entry')).toBeNull());
  });
});

describe('LogoTab — proxy 失败降级', () => {
  it('网格缩略图加载失败 → 名称前两字占位', async () => {
    setLocation('/?p=market&tab=logos');
    render(<Host />);
    const img = (await screen.findByAltText('React logo')) as HTMLImageElement;
    fireEvent.error(img);
    expect(await screen.findByText('Re')).toBeInTheDocument();
  });

  it('详情大图失败 → 重试占位;点击重试恢复加载', async () => {
    setLocation('/?p=market&tab=logos&entry=react');
    render(<Host />);
    const img = (await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="logo-detail-img"]');
      expect(el).not.toBeNull();
      return el as Element;
    }));
    fireEvent.error(img);
    const retry = await screen.findByText('加载失败,点击重试');
    fireEvent.click(retry);
    await vi.waitFor(() => expect(document.querySelector('[data-slot="logo-detail-img"]')).not.toBeNull());
  });

  it('SVG 源码代理失败 → CodeViewer 错误态', async () => {
    setLocation('/?p=market&tab=logos&entry=vite');
    render(<Host />);
    expect(await screen.findByText(/加载失败/)).toBeInTheDocument();
  });
});
