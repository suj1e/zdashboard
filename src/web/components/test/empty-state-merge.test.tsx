/**
 * T4 EmptyState 双实现合并验收:
 * - components/EmptyState 仅 re-export kit 版(同一函数引用);
 * - PlaceholderWorkspace(kit EmptyState 消费点)正常渲染 data-slot="empty-state"。
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState as ComponentsEmptyState } from '../EmptyState.js';
import { EmptyState as KitEmptyState } from '../../kit/EmptyState.js';
import { PlaceholderWorkspace } from '../PlaceholderWorkspace.js';

describe('EmptyState 双实现合并', () => {
  it('components 版与 kit 版是同一函数引用(re-export)', () => {
    expect(ComponentsEmptyState).toBe(KitEmptyState);
  });

  it('PlaceholderWorkspace 渲染统一空态(含标题与引导)', () => {
    render(<PlaceholderWorkspace label="bugs" />);
    expect(document.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(screen.getByText('bugs · 无可视化界面')).toBeInTheDocument();
    expect(screen.getByText(/web\/index\.html/)).toBeInTheDocument();
  });
});
