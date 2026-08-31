/**
 * ux-low-batch T3:design 视口模式/宽高持久化(`zd-design-viewport`)。
 * 切模式/改自定义宽高 → 卸载 → 重挂,视口状态保持(经 safeStorage 落盘)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Workspace from '../Workspace.js';

const CSS_FIXTURE = ':root { --a: #fff; }';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  localStorage.clear();
  setLocation('/?p=design&type=token&asset=a%2Ftokens.css');
  vi.stubGlobal('fetch', vi.fn(async () => {
    return { ok: true, status: 200, text: async () => CSS_FIXTURE } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

function mount() {
  return render(<Workspace params={new URLSearchParams('?p=design&type=token&asset=a%2Ftokens.css')} />);
}

describe('design Workspace — 视口状态持久化(zd-design-viewport)', () => {
  it('切 768 模式 → 卸载重挂后仍是 768px', async () => {
    const { unmount } = mount();
    (await screen.findAllByText('a/tokens.css'))[0];
    expect(screen.queryByText('768px')).toBeNull(); // 默认桌面模式(无 768px 标签)

    fireEvent.click(screen.getByRole('button', { name: /768/ }));
    expect(screen.getByText('768px')).toBeInTheDocument();

    unmount();
    mount();
    (await screen.findAllByText('a/tokens.css'))[0];
    await waitFor(() => expect(screen.getByText('768px')).toBeInTheDocument()); // 重挂后保持
  });

  it('改自定义宽高 → 卸载重挂后数值保持', async () => {
    const { unmount } = mount();
    (await screen.findAllByText('a/tokens.css'))[0];

    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '900' } });

    unmount();
    mount();
    (await screen.findAllByText('a/tokens.css'))[0];
    await waitFor(() => {
      expect((screen.getByLabelText('自定义宽度') as HTMLInputElement).value).toBe('1200');
      expect((screen.getByLabelText('自定义高度') as HTMLInputElement).value).toBe('900');
    });
  });

  it('存储值非法(越界/非数字)→ 回落默认,不崩', () => {
    localStorage.setItem('zd-design-viewport', '{ not json');
    expect(() => mount()).not.toThrow();
  });
});
