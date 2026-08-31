/**
 * T2 断线统一验收(Topbar/StatusBar 同源同文案):
 * - lost 态两处文案统一为「重连中」;
 * - lost 点统一 bg-warning(不再一个 destructive 一个 muted 打架);
 * - StatusBar lost 态 chip 变按钮,点击触发 location.reload(强刷)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Topbar } from '../../components/Topbar.js';
import { StatusBar } from '../../layout/StatusBar.js';
import { TooltipProvider } from '../../components/ui/tooltip.js';
import { FakeES } from '../helpers/fake-es.js';

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) }) as unknown as Response));
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 驱动最近一条 SSE 连接进入 lost 态(先 open 建立,再 error 断线);act 包裹确保状态落地 */
function goLost() {
  const es = FakeES.instances.at(-1);
  if (!es) throw new Error('no FakeES');
  act(() => {
    es.onopen?.();
    es.onerror?.();
  });
}

describe('Topbar — lost 态文案与色点', () => {
  it('lost → 文案「重连中」,点为 bg-warning', () => {
    render(<Topbar stoppedRef={{ current: false }} />);
    goLost();
    expect(screen.getByText('重连中')).toBeInTheDocument();
    const dot = screen.getByText('重连中').previousElementSibling as HTMLElement;
    expect(dot.className).toContain('bg-warning');
    expect(dot.className).not.toContain('bg-destructive');
  });
});

describe('StatusBar — lost 态 chip 强刷', () => {
  /**
   * jsdom 将 window.location.reload 标记为不可重定义,其调用经 virtualConsole
   * 转发为 console.error('Error: Not implemented: window.location.reload'),
   * 以此作为「reload 被触发」的可观测信号(与 App.test 同法)。
   */
  function stubReloadSignal() {
    const errSpy = vi.spyOn(console, 'error');
    return {
      fired: () => errSpy.mock.calls.some((c) => String(c[0]).includes('Not implemented')),
      restore: () => errSpy.mockRestore(),
    };
  }

  it('lost → chip 变按钮,文案「重连中」,点为 bg-warning', () => {
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    goLost();
    const chip = screen.getByRole('button', { name: /重连中/ });
    expect(chip).toBeInTheDocument();
    // warning 点:chip 内色点统一 bg-warning(spec: lost 点 bg-warning)
    expect(chip.querySelector('span')?.className).toContain('bg-warning');
  });

  it('lost chip 点击 → 触发 window.location.reload', () => {
    const signal = stubReloadSignal();
    try {
      render(
        <TooltipProvider>
          <StatusBar projectPath="/tmp/demo" />
        </TooltipProvider>,
      );
      goLost();
      expect(signal.fired()).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: /重连中/ }));
      expect(signal.fired()).toBe(true);
    } finally {
      signal.restore();
    }
  });

  it('live 态 chip 仍是 span(非按钮),文案「SSE」', () => {
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    act(() => { FakeES.instances.at(-1)!.onopen?.(); });
    expect(screen.queryByRole('button', { name: /SSE/ })).not.toBeInTheDocument();
    expect(screen.getByText('SSE')).toBeInTheDocument();
  });
});
