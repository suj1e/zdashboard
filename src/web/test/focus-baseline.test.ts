/**
 * T5 focus-visible 全局基线(CSS 断言):
 * - globals.css 必须提供全局 :focus-visible 焦点环(outline 2px hsl(var(--ring)) + offset 2px);
 * - 组件内不再散落 focus:outline-none / 裸 outline-none(全局基线取代,保留 border 色变化);
 * - 关键输入件的 focus:border-* 指示保留(基线之外的补充,不许删)。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    // 仅扫源码组件;css 与测试文件自身(含断言字符串)排除
    else if (/\.(tsx|ts)$/.test(name) && !p.includes(`${sep}test${sep}`) && !name.includes('.test.')) out.push(p);
  }
  return out;
}

const globals = readFileSync(join(ROOT, 'web', 'globals.css'), 'utf8');

describe('globals.css — 全局焦点环基线', () => {
  it('含 :focus-visible 规则:outline 2px solid hsl(var(--ring)) + offset 2px', () => {
    const m = globals.match(/:focus-visible\s*\{([^}]*)\}/);
    expect(m, 'globals.css 应有全局 :focus-visible 规则').toBeTruthy();
    expect(m![1]).toContain('outline: 2px solid hsl(var(--ring))');
    expect(m![1]).toContain('outline-offset: 2px');
  });
});

describe('组件 — 散落焦点样式清理', () => {
  it('src 下不再出现 focus:outline-none', () => {
    const offenders = walk(ROOT).filter((f) => readFileSync(f, 'utf8').includes('focus:outline-none'));
    expect(offenders, `仍含 focus:outline-none: ${offenders.join(', ')}`).toEqual([]);
  });

  it.each([
    ['web/home/HomeGrid.tsx'],
    ['web/components/LogViewer.tsx'],
    ['plugins/design/Workspace.tsx'],
    ['plugins/view/Sidebar.tsx'],
  ])('%s 不再含 outline-none(全局基线取代)', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    expect(src).not.toMatch(/\bfocus:outline-none\b/);
    expect(src).not.toMatch(/\binline outline-none\b/);
    expect(src).not.toMatch(/(?<!focus-visible:)outline-none/);
  });

  it.each([
    ['plugins/design/Workspace.tsx', 'focus:border-primary'],
    ['plugins/view/Sidebar.tsx', 'focus:border-primary'],
    ['web/components/LogViewer.tsx', 'focus:border-muted-foreground/50'],
  ])('%s 保留 border 色变化(%s)', (rel, cls) => {
    expect(readFileSync(join(ROOT, rel), 'utf8')).toContain(cls);
  });
});
