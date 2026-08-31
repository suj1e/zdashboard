/**
 * T1 HomeGrid 卡片骨架:plugins 空(未就绪)时渲染 3 张骨架卡片 + 探测行,不渲染真实卡片。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeGrid, type Detects } from '../../home/HomeGrid.js';

const DETECT: Detects = { hasOpenspec: true, hasDocs: false, hasJust: false };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) }) as unknown as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HomeGrid — 空插件卡片骨架', () => {
  it('plugins 空 → 恰 3 张骨架卡片,探测行仍在', () => {
    render(<HomeGrid plugins={[]} detect={DETECT} onSelect={() => {}} />);
    expect(document.querySelectorAll('[data-slot="home-card-skeleton"]').length).toBe(3);
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.getByText('探测')).toBeInTheDocument();
    // 无真实卡片按钮
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('plugins 就绪 → 无骨架,渲染真实卡片', () => {
    render(
      <HomeGrid
        plugins={[{ mode: 'view', label: '项目浏览', icon: '▣' }]}
        detect={DETECT}
        onSelect={() => {}}
      />,
    );
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.getByRole('button', { name: /项目浏览/ })).toBeInTheDocument();
  });
});
