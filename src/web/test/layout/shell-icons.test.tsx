import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../components/ui/tooltip';
import { IconRail } from '../../layout/IconRail';
import { HomeGrid } from '../../home/HomeGrid';

const plugins = [
  { mode: 'stats', label: '项目统计', icon: '📊' },
  { mode: 'unknown-ext', label: '外部插件', icon: '🧪' },
];

function rail(active: string | null = null, onSelect = vi.fn()) {
  return render(
    <TooltipProvider>
      <IconRail active={active} onSelect={onSelect} plugins={plugins} />
    </TooltipProvider>
  );
}

describe('IconRail — useIcons 渲染', () => {
  it('映射内 mode 渲染 svg 图标而非 emoji 字符', () => {
    const { container } = rail();
    // nav 内按钮顺序:[首页, stats, unknown-ext]
    const buttons = container.querySelectorAll('nav button');
    expect(buttons).toHaveLength(3);
    expect(buttons[1].querySelector('svg')).not.toBeNull();
    expect(buttons[1].textContent).not.toContain('📊');
  });

  it('未映射 mode 回退 manifest.icon 字面值', () => {
    const { container } = rail();
    const buttons = container.querySelectorAll('nav button');
    expect(buttons[2].querySelector('svg')).toBeNull();
    expect(buttons[2].textContent).toContain('🧪');
  });

  it('点击回调 mode,home 按钮回 null;active 态 aria-current', () => {
    const onSelect = vi.fn();
    const { container } = rail('stats', onSelect);
    const buttons = container.querySelectorAll('nav button');
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'stats');
    expect(onSelect).toHaveBeenNthCalledWith(2, null);
    expect(buttons[1].getAttribute('aria-current')).toBe('page');
    expect(buttons[0].getAttribute('aria-current')).toBeNull();
  });
});

describe('HomeGrid — 卡片图标与徽标', () => {
  const detect = { hasOpenspec: true, hasDocs: false, hasJust: true };

  it('映射内卡片渲染 svg 且探测 chips 为三枚(bugs 已移除)', () => {
    render(<HomeGrid plugins={[...plugins]} detect={detect} onSelect={vi.fn()} />);
    const cards = screen.getAllByRole('button');
    expect(cards[0].querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('bugs')).toBeNull();
    expect(screen.getByText('openspec')).toBeInTheDocument();
    expect(screen.getByText('just')).toBeInTheDocument();
  });

  it('external 徽标与点击选中', () => {
    const onSelect = vi.fn();
    render(
      <HomeGrid
        plugins={[{ mode: 'ext-one', label: 'Ext', icon: '🧪', external: true, description: 'desc' }]}
        detect={detect}
        onSelect={onSelect}
      />
    );
    expect(screen.getByText('外部')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ext/ }));
    expect(onSelect).toHaveBeenCalledWith('ext-one');
  });
});
