import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarFrame } from '../../layout/SidebarFrame';

describe('SidebarFrame', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    storage['zd-sidebar-view'] = '1';
    storage['zd-sidebar-design'] = '0';
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { for (const k in storage) delete storage[k]; },
    } as any);
  });

  it('reads initial open state from localStorage per mode', () => {
    const { container: viewContainer } = render(
      <SidebarFrame mode="view"><div>View</div></SidebarFrame>
    );
    const { container: designContainer } = render(
      <SidebarFrame mode="design"><div>Design</div></SidebarFrame>
    );
    expect(viewContainer.querySelector('[aria-label="折叠侧栏"]')).toBeTruthy();
    expect(designContainer.querySelector('[aria-label="展开侧栏"]')).toBeTruthy();
  });

  it('toggles and persists to localStorage', () => {
    const { container } = render(
      <SidebarFrame mode="view"><div>View</div></SidebarFrame>
    );
    const btn = container.querySelector('[aria-label="折叠侧栏"]')!;
    fireEvent.click(btn);
    expect(storage['zd-sidebar-view']).toBe('false');
  });

  it('hover hotzone temporarily expands collapsed sidebar without writing storage', () => {
    const { container } = render(
      <SidebarFrame mode="design"><div>Design</div></SidebarFrame>
    );
    // design 预置为折叠（storage=0），出现热区
    const hotzone = container.querySelector('.w-1\\.5')!;
    expect(hotzone).toBeTruthy();
    const panel = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(panel.className).toContain('sm:w-0');
    fireEvent.mouseEnter(hotzone);
    expect(panel.className).toContain('sm:w-[var(--sidebar-w)]'); // 临时展开
    expect(storage['zd-sidebar-design']).toBe('0');    // 不写记忆
    fireEvent.mouseLeave(hotzone);
    expect(panel.className).toContain('sm:w-0');       // 移开收回
  });

  it('mobile overlay click collapses and persists', () => {
    const { container } = render(
      <SidebarFrame mode="view"><div>View</div></SidebarFrame>
    );
    const overlay = container.querySelector('.bg-black\\/40')!;
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);
    expect(storage['zd-sidebar-view']).toBe('false');
  });
});

describe('SidebarFrame resizer', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    storage['zd-sidebar-view'] = '1';
    storage['zd-sidebar-design'] = '0';
    delete storage['zd-sidebar-w'];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { for (const k in storage) delete storage[k]; },
    } as any);
  });

  const renderView = () => render(<SidebarFrame mode="view"><div>View</div></SidebarFrame>);
  const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement;
  const handleOf = (container: HTMLElement) =>
    container.querySelector('[role="separator"]') as HTMLElement;
  const varW = (root: HTMLElement) => root.style.getPropertyValue('--sidebar-w');

  it('renders handle with separator semantics in expanded desktop state', () => {
    const { container } = renderView();
    const handle = handleOf(container);
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.tabIndex).toBe(0);
  });

  it('pointer drag moves container --sidebar-w and persists on pointerup', () => {
    const { container } = renderView();
    const root = rootOf(container);
    const handle = handleOf(container);
    expect(varW(root)).toBe('280px');
    fireEvent.pointerDown(handle, { clientX: 280 });
    fireEvent.pointerMove(handle, { clientX: 330 });
    expect(varW(root)).toBe('330px');
    fireEvent.pointerUp(handle);
    expect(storage['zd-sidebar-w']).toBe('330');
  });

  it('clamps dragged width to 220–480 and persists clamped value', () => {
    const { container } = renderView();
    const root = rootOf(container);
    const handle = handleOf(container);
    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerMove(handle, { clientX: 2000 });
    expect(varW(root)).toBe('480px');
    fireEvent.pointerMove(handle, { clientX: -500 });
    expect(varW(root)).toBe('220px');
    fireEvent.pointerUp(handle);
    expect(storage['zd-sidebar-w']).toBe('220');
  });

  it('double click resets width to 280 and clears persisted key', () => {
    storage['zd-sidebar-w'] = '400';
    const { container } = renderView();
    const root = rootOf(container);
    expect(varW(root)).toBe('400px');
    fireEvent.doubleClick(handleOf(container));
    expect(varW(root)).toBe('280px');
    expect(storage['zd-sidebar-w']).toBeUndefined();
  });

  it('keyboard arrow keys adjust width by ±16px', () => {
    const { container } = renderView();
    const root = rootOf(container);
    const handle = handleOf(container);
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(varW(root)).toBe('296px');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(varW(root)).toBe('280px');
  });

  it('handle is hidden below sm (mobile drawer) via responsive classes', () => {
    // jsdom 不评估媒体查询：把手常驻 DOM，靠 hidden + sm:block 在 <sm 隐藏
    const { container } = renderView();
    const handle = handleOf(container);
    expect(handle.className).toContain('hidden');
    expect(handle.className).toContain('sm:block');
  });

  it('collapsed sidebar does not render handle', () => {
    // design 预置为折叠（storage=0）
    const { container } = render(
      <SidebarFrame mode="design"><div>Design</div></SidebarFrame>
    );
    expect(handleOf(container)).toBeNull();
  });

  it('does not render handle when plugin has no sidebar content', () => {
    const { container } = render(
      <SidebarFrame mode="view" hasContent={false}><div>View</div></SidebarFrame>
    );
    expect(handleOf(container)).toBeNull();
  });

  it('ignores non-numeric persisted width and falls back to 280', () => {
    storage['zd-sidebar-w'] = 'abc';
    const { container } = renderView();
    expect(varW(rootOf(container))).toBe('280px');
  });

  it('ignores out-of-range persisted width and falls back to 280', () => {
    storage['zd-sidebar-w'] = '100';
    const { container } = renderView();
    expect(varW(rootOf(container))).toBe('280px');
  });
});
