/**
 * T4 动效 Tab 组件验收:
 * - demo 方块实时播放(库 css 经代理注入 <style>)与 hover 重播(data-replays 递增);
 * - 源码查看(规则 + keyframes)+ 转提示词(CSS 内嵌);
 * - 断网降级:库 css 502 时目录仍可浏览,提示词不含在线源码照常可用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { useRoute, __resetRouterForTest } from '../../../web/router.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetMotionLibCssForTest } from '../tabs/MotionTab.js';

const ANIMATE_CSS = [
  '.animate__animated.animate__bounce{animation:bounce 1s infinite both}',
  '@keyframes bounce{0%{transform:translateY(0)}50%{transform:translateY(-25%)}}',
].join('\n');

const HOVER_CSS = [
  '.hvr-float{display:inline-block;transition-duration:.3s;transition-property:transform}',
  '.hvr-float:hover,.hvr-float:focus{transform:translateY(-4px)}',
].join('\n');

const MOTIONS = [
  { id: 'animate-bounce', name: '弹跳', desc: '上下弹跳强调', cls: 'animate__bounce', lib: 'animate.css' },
  { id: 'hover-float', name: '上浮', desc: 'hover 时上浮', cls: 'hvr-float', lib: 'hover.css' },
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
  __resetMotionLibCssForTest();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__market/catalog/motions')) {
      return { ok: true, status: 200, json: async () => ({ entries: MOTIONS }) } as unknown as Response;
    }
    if (url.includes('/__market/proxy')) {
      const target = new URL(url, 'http://localhost').searchParams.get('url') ?? '';
      const body = target.includes('animate') ? ANIMATE_CSS : HOVER_CSS;
      return { ok: true, status: 200, text: async () => body } as unknown as Response;
    }
    return { ok: false, status: 404, json: async () => null } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('MotionTab — demo 播放与 hover 重播', () => {
  it('demo 方块组装库类(animate__animated + cls / hvr- 直用)', async () => {
    setLocation('/?p=market&tab=motions');
    render(<Host />);
    const demo = (await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="motion-demo"]');
      expect(el).not.toBeNull();
      return el as Element;
    }));
    expect(demo.className).toContain('animate__animated');
    expect(demo.className).toContain('animate__bounce');
  });

  it('库 css 经代理拉取并注入 <style>', async () => {
    setLocation('/?p=market&tab=motions');
    render(<Host />);
    await vi.waitFor(() => {
      expect(document.querySelector('style[data-market-motion-lib="animate.css"]')?.textContent).toContain('@keyframes bounce');
    });
  });

  it('hover 触发重播:data-replays 递增', async () => {
    setLocation('/?p=market&tab=motions&entry=animate-bounce');
    render(<Host />);
    const demo = (await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="motion-detail"] [data-slot="motion-demo"]');
      expect(el).not.toBeNull();
      return el as Element;
    })) as HTMLElement;
    expect(demo.getAttribute('data-replays')).toBe('0');
    fireEvent.mouseEnter(demo);
    expect(demo.getAttribute('data-replays')).toBe('1');
    fireEvent.mouseEnter(demo);
    expect(demo.getAttribute('data-replays')).toBe('2');
  });
});

describe('MotionTab — 详情(源码 + 转提示词)', () => {
  it('?entry= 直达:源码含规则与 keyframes,时序参数可见', async () => {
    setLocation('/?p=market&tab=motions&entry=animate-bounce');
    render(<Host />);
    const src = await vi.waitFor(() => {
      const el = document.querySelector('[data-slot="motion-source"]')?.textContent;
      expect(el).toContain('@keyframes bounce');
      return el as string;
    });
    expect(src).toContain('animation:bounce 1s infinite both');
    expect(screen.getByText('1s')).toBeInTheDocument();
    expect(screen.getByText('infinite')).toBeInTheDocument();
  });

  it('转提示词:CSS 源码内嵌 + prefers-reduced-motion 要求', async () => {
    setLocation('/?p=market&tab=motions&entry=animate-bounce');
    render(<Host />);
    const box = (await screen.findByLabelText('提示词')) as HTMLTextAreaElement;
    await vi.waitFor(() => expect(box.value).toContain('@keyframes bounce'));
    expect(box.value).toContain('弹跳');
    expect(box.value).toContain('prefers-reduced-motion');
  });
});

describe('MotionTab — 断网降级', () => {
  it('库 css 代理 502:目录仍可浏览 + 明示动效不可播放', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__market/catalog/motions')) {
        return { ok: true, status: 200, json: async () => ({ entries: MOTIONS }) } as unknown as Response;
      }
      return { ok: false, status: 502, text: async () => 'upstream error' } as unknown as Response;
    }));
    setLocation('/?p=market&tab=motions');
    render(<Host />);
    // 目录照常
    expect(await screen.findByText('弹跳')).toBeInTheDocument();
    expect(screen.getByText('上浮')).toBeInTheDocument();
    // 降级明示
    expect(screen.getByText(/动效库 CSS 加载失败/)).toBeInTheDocument();
  });

  it('离线时提示词仍可生成(源码占位,不空白模板)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__market/catalog/motions')) {
        return { ok: true, status: 200, json: async () => ({ entries: MOTIONS }) } as unknown as Response;
      }
      return { ok: false, status: 502, text: async () => 'upstream error' } as unknown as Response;
    }));
    setLocation('/?p=market&tab=motions&entry=animate-bounce');
    render(<Host />);
    const box = await screen.findByLabelText('提示词');
    await vi.waitFor(() => expect((box as HTMLTextAreaElement).value).toContain('弹跳'));
    expect((box as HTMLTextAreaElement).value).toContain('源码暂不可用');
    // 选中项源码区错误态而非空白
    expect(document.querySelector('[data-slot="motion-source-error"]')).not.toBeNull();
  });
});
