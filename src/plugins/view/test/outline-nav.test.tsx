/**
 * 2026-08-31-view-outline-ux T2 验收:
 * - 长标题两行渲染(line-clamp-2,不再 truncate) + title 属性暴露全文;
 * - 左缘 ResizeHandle 拖宽/双击重置,zd-outline-w 持久化(clamp 176–400,默认 176);
 * - 缩进 6+(level-1)*10 与封顶版 Math.min(level-1,2) 对 h1–h3 等价;
 * - <md 仍隐藏(hidden md:flex),把手 md:block。
 * jsdom 缺 IntersectionObserver,stub 之(MutationObserver 内建支持)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import OutlineNav from '../OutlineNav.js';

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** 文档容器 + 大纲导航挂同一 ref,容器 DOM 在 OutlineNav effect 前已挂载 */
function Harness({ headings }: { headings: Array<[level: number, text: string]> }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={ref}>
        {headings.map(([level, text], i) => {
          const Tag = `h${level}` as 'h1';
          return <Tag key={i} id={`h-${i}`}>{text}</Tag>;
        })}
      </div>
      <OutlineNav containerRef={ref} />
    </div>
  );
}

const LONG_TITLE = '这是一个特别长的大纲标题超过一行宽度会溢出的中文文档章节名称用来验证两行截断行为';

const navOf = (container: HTMLElement) =>
  container.querySelector('nav[aria-label="文档大纲"]') as HTMLElement;
const handleOf = (container: HTMLElement) =>
  navOf(container).querySelector('[role="separator"]') as HTMLElement;
const buttonsOf = (container: HTMLElement) =>
  Array.from(navOf(container).querySelectorAll('button'));

describe('OutlineNav outline items', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { for (const k in storage) delete storage[k]; },
    } as any);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders long heading text with two-line clamp (no single-line truncate)', () => {
    const { container } = render(<Harness headings={[[1, LONG_TITLE]]} />);
    const btn = buttonsOf(container)[0];
    expect(btn.textContent).toBe(LONG_TITLE);
    expect(btn.className).toContain('line-clamp-2');
    expect(btn.className).not.toContain('truncate');
  });

  it('exposes full heading text via title attribute', () => {
    const { container } = render(<Harness headings={[[1, LONG_TITLE]]} />);
    expect(buttonsOf(container)[0].getAttribute('title')).toBe(LONG_TITLE);
  });

  it('indents levels 1–3 by 6/16/26px (capped formula equals legacy for h1–h3)', () => {
    const { container } = render(
      <Harness headings={[[1, '一级'], [2, '二级'], [3, '三级']]} />
    );
    const [h1, h2, h3] = buttonsOf(container);
    expect(h1.style.paddingLeft).toBe('6px');
    expect(h2.style.paddingLeft).toBe('16px');
    expect(h3.style.paddingLeft).toBe('26px');
  });
});

describe('OutlineNav resize handle', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { for (const k in storage) delete storage[k]; },
    } as any);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderNav = () => render(<Harness headings={[[1, '章节']]} />);

  it('defaults to 176px width when nothing persisted', () => {
    const { container } = renderNav();
    expect(navOf(container).style.width).toBe('176px');
  });

  it('reads persisted width from zd-outline-w; ignores invalid or out-of-range', () => {
    storage['zd-outline-w'] = '300';
    const first = renderNav();
    expect(navOf(first.container).style.width).toBe('300px');
    first.unmount();

    storage['zd-outline-w'] = '9999';
    const second = renderNav();
    expect(navOf(second.container).style.width).toBe('176px');
    second.unmount();

    storage['zd-outline-w'] = 'abc';
    const third = renderNav();
    expect(navOf(third.container).style.width).toBe('176px');
  });

  it('separator exposes vertical orientation and value semantics 176–400', () => {
    const { container } = renderNav();
    const handle = handleOf(container);
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-label')).toBe('调整大纲宽度');
    expect(handle.getAttribute('aria-valuemin')).toBe('176');
    expect(handle.getAttribute('aria-valuemax')).toBe('400');
    expect(handle.getAttribute('aria-valuenow')).toBe('176');
    expect(handle.tabIndex).toBe(0);
  });

  it('pointer drag widens nav and persists final width on pointerup', () => {
    const { container } = renderNav();
    const nav = navOf(container);
    const handle = handleOf(container);
    fireEvent.pointerDown(handle, { clientX: 200 });
    fireEvent.pointerMove(handle, { clientX: 300 });
    expect(nav.style.width).toBe('276px');
    fireEvent.pointerUp(handle);
    expect(storage['zd-outline-w']).toBe('276');
  });

  it('clamps dragged width to 176–400 and persists clamped value', () => {
    const { container } = renderNav();
    const nav = navOf(container);
    const handle = handleOf(container);
    fireEvent.pointerDown(handle, { clientX: 200 });
    fireEvent.pointerMove(handle, { clientX: 2000 });
    expect(nav.style.width).toBe('400px');
    fireEvent.pointerMove(handle, { clientX: -500 });
    expect(nav.style.width).toBe('176px');
    fireEvent.pointerUp(handle);
    expect(storage['zd-outline-w']).toBe('176');
  });

  it('double click resets to 176 and clears persisted key', () => {
    storage['zd-outline-w'] = '320';
    const { container } = renderNav();
    const nav = navOf(container);
    expect(nav.style.width).toBe('320px');
    fireEvent.doubleClick(handleOf(container));
    expect(nav.style.width).toBe('176px');
    expect(storage['zd-outline-w']).toBeUndefined();
  });

  it('ignores double-click reset right after a moved drag (drag tail misfire)', () => {
    const { container } = renderNav();
    const nav = navOf(container);
    const handle = handleOf(container);
    fireEvent.pointerDown(handle, { clientX: 176 });
    fireEvent.pointerMove(handle, { clientX: 260 });
    fireEvent.pointerUp(handle);
    expect(nav.style.width).toBe('260px');
    fireEvent.doubleClick(handle);
    expect(nav.style.width).toBe('260px');
    expect(storage['zd-outline-w']).toBe('260');
  });

  it('keyboard arrows adjust width by ±16 and persist', () => {
    const { container } = renderNav();
    const nav = navOf(container);
    const handle = handleOf(container);
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(nav.style.width).toBe('192px');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(nav.style.width).toBe('176px');
    expect(storage['zd-outline-w']).toBe('176');
  });

  it('nav and handle stay hidden below md via responsive classes', () => {
    const { container } = renderNav();
    const nav = navOf(container);
    // <md 隐藏由 nav 自身的 hidden md:flex 承担;把手是 nav 首层子节点,随 nav 一并隐藏
    expect(nav.className).toContain('hidden');
    expect(nav.className).toContain('md:flex');
    expect(nav.className).not.toContain('w-44');
    const handle = handleOf(container);
    expect(handle.className).not.toContain('absolute');
  });
});
