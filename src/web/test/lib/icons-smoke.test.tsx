import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ICON_MAP, useIcons } from '../../lib/icons.js';
import { STYLES } from '../../lib/themes.js';

/**
 * ICON_MAP 渲染冒烟:每个 key × 每个主题都必须渲染出非空 svg 节点。
 * 防缺漏断言的测试化——任何值脱离 import 池(如 lucide 无此导出)立即在此暴露。
 */
describe('ICON_MAP 渲染冒烟(100% 键 × 三主题)', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'default';
  });

  const themes = [...STYLES.map((s) => s.id), 'default'] as string[];
  const uniqueThemes = [...new Set(themes)];

  for (const theme of uniqueThemes) {
    it(`theme=${theme}: 全部 ${Object.keys(ICON_MAP).length} 个 key 渲染非空`, () => {
      document.documentElement.dataset.theme = theme;
      const { icon } = renderHookIcon();

      for (const key of Object.keys(ICON_MAP) as (keyof typeof ICON_MAP)[]) {
        const { container, unmount } = render(<div data-testid="host">{icon(key, 'h-4 w-4')}</div>);
        const svg = container.querySelector('svg');
        expect(svg, `theme=${theme} key=${String(key)} 应渲染出 svg`).not.toBeNull();
        unmount();
      }
    });
  }
});

/** 独立小包装:每次取最新 hook 实例(dataset.theme 在 render 前已写入) */
function renderHookIcon() {
  let captured!: { icon: (key: keyof typeof ICON_MAP, className?: string) => React.ReactNode };
  function Probe() {
    const { icon } = useIcons();
    captured = { icon };
    return null;
  }
  render(<Probe />);
  return captured;
}
