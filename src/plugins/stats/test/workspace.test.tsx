/**
 * T1 stats Workspace 迁移验收:
 * - 页面冒烟渲染零 console error(5 卡片 + Top10 + 探测区);
 * - 钻取做实:点 Worktree 卡 → ?p=view&card=worktree;点未提交卡 → ?p=view&card=dirty;
 * - 探测区数据切 /__detect;
 * - 数据获取走 usePluginData(/__stats/data)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

const STATS = {
  root: 'zdashboard',
  files: 120,
  dirs: 30,
  totalSize: 1024 * 1024,
  byExt: [
    { ext: '.ts', count: 60 },
    { ext: '.tsx', count: 30 },
  ],
  markdown: 12,
  openspec: { active: 2, archived: 5 },
  hasJust: true,
  worktrees: 3,
  branch: 'main',
  dirty: 4,
};

const DETECT = { hasOpenspec: true, hasDocs: true, hasJust: true };

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  setLocation('/?p=stats');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__detect')) {
      return { json: async () => DETECT, text: async () => JSON.stringify(DETECT) } as Response;
    }
    if (url.includes('/__stats/data')) {
      return { json: async () => STATS, text: async () => JSON.stringify(STATS) } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('stats Workspace — 页面冒烟', () => {
  it('渲染 5 卡片 + Top10 + 探测区,零 console error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    for (const label of ['文件', '目录', '总大小', 'Worktree', '未提交']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('.ts')).toBeInTheDocument(); // Top10
    expect(screen.getByText(/justfile/)).toBeInTheDocument(); // 探测区
    expect(screen.getByText('4 未提交')).toBeInTheDocument();
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('探测区 justfile 状态来自 /__detect 而非 /__stats/data', async () => {
    // detect 报 false(与 STATS.hasJust=true 相反)→ 页面必须显示 ✗
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__detect')) {
        return { json: async () => ({ ...DETECT, hasJust: false }), text: async () => '' } as Response;
      }
      return { json: async () => STATS, text: async () => '' } as Response;
    }));
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    expect(await screen.findByText(/justfile ✗/)).toBeInTheDocument();
  });
});

describe('stats Workspace — 钻取 navigate 做实', () => {
  it('点 Worktree 卡 → ?p=view&card=worktree', async () => {
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    fireEvent.click(await screen.findByRole('button', { name: /Worktree/ }));
    const q = new URLSearchParams(window.location.search);
    expect(q.get('p')).toBe('view');
    expect(q.get('card')).toBe('worktree');
  });

  it('点未提交卡 → ?p=view&card=dirty(view 侧读取后高亮 dirty)', async () => {
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    fireEvent.click(await screen.findByRole('button', { name: /未提交/ }));
    const q = new URLSearchParams(window.location.search);
    expect(q.get('p')).toBe('view');
    expect(q.get('card')).toBe('dirty');
  });

  it('文件/目录/总大小卡不可钻取(disabled)', async () => {
    render(<Workspace params={new URLSearchParams('?p=stats')} />);
    expect(await screen.findByRole('button', { name: /文件/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /目录/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /总大小/ })).toBeDisabled();
  });
});
