/**
 * ux-low-batch T5:StatusBar 文案基线 + design 工具栏度量统一(CSS 断言)。
 * - 状态形容词中文化:git.dirty=0 → 「干净」(专有名词/状态词基线,design.md 备查);
 * - 工具栏高度 token --design-toolbar-h 对齐 LogViewer 工具行 h-8(=32px)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen, act } from '@testing-library/react';
import { StatusBar } from '../../layout/StatusBar.js';
import { TooltipProvider } from '../../components/ui/tooltip.js';
import { FakeES } from '../helpers/fake-es.js';

const globals = readFileSync(join(resolve(process.cwd(), 'src'), 'web', 'globals.css'), 'utf8');

describe('design 工具栏度量(CSS 断言)', () => {
  it('--design-toolbar-h = 32px(与 LogViewer h-8 同度量)', () => {
    expect(globals).toMatch(/--design-toolbar-h:\s*32px/);
  });
});

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ branch: 'main', dirty: 0 }) }) as unknown as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StatusBar — 文案基线', () => {
  it('dirty=0 → 显示「干净」,不再出现英文 clean', async () => {
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    act(() => { FakeES.instances.at(-1)!.onopen?.(); });
    expect(await screen.findByText('干净')).toBeInTheDocument();
    expect(screen.queryByText('clean')).toBeNull();
  });
});
