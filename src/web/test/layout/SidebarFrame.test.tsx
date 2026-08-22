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
    expect(storage['zd-sidebar-view']).toBe('0');
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
    expect(panel.className).toContain('sm:w-[280px]'); // 临时展开
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
    expect(storage['zd-sidebar-view']).toBe('0');
  });
});
