import { describe, it, expect } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { MODE_ICON_MAP, ICON_MAP, useModeIcon } from '../../lib/icons.js';
import type { ReactNode } from 'react';

describe('mode→icon 平台映射', () => {
  it('已删 apply 后注册表无 apply/apply-batch mode', () => {
    expect(MODE_ICON_MAP['apply']).toBeUndefined();
    expect(MODE_ICON_MAP['apply-batch']).toBeUndefined();
  });

  it('已删 market 后注册表无 market mode(sparkles 本体保留)', () => {
    expect(MODE_ICON_MAP['market']).toBeUndefined();
  });

  it('覆盖全部内置插件且键都在 ICON_MAP 中注册', () => {
    const modes = ['stats', 'view', 'design', 'just'];
    for (const m of modes) {
      const key = MODE_ICON_MAP[m];
      expect(key, `mode ${m} 应有映射`).toBeDefined();
      expect(ICON_MAP[key], `${m} 的 icon key ${String(key)} 应已注册`).toBeDefined();
    }
  });

  it('useModeIcon 返回 svg 节点(mapped),未知 mode 返回 null 交由 fallback', () => {
    function Host({ mode, children }: { mode: string; children?: ReactNode }) {
      const node = useModeIcon(mode);
      return <div>{node ?? children}</div>;
    }
    const mapped = render(<Host mode="stats" />);
    expect(mapped.container.querySelector('svg')).not.toBeNull();
    const unknown = render(<Host mode="no-such-mode"><b data-testid="fb">FALLBACK</b></Host>);
    expect(unknown.container.querySelector('svg')).toBeNull();
    expect(unknown.getByTestId('fb')).toBeInTheDocument();
  });
});
