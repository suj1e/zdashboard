import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// vitest 始终以项目根为 cwd(vitest.config.ts root),据此定位被测文件
const projectRoot = process.cwd();

// 全局约定(tailwind.config.ts + globals.css):颜色 token 为 HSL 三元组,消费端一律 hsl(var(--x))。
// 本守卫解析 src/web/themes/*.css,断言所有被 hsl() 消费的颜色变量值均为 HSL 三元组格式,
// 防止再写入 RGB 十进制三元组(见 openspec/changes/fix-slate-dark-and-mode-toggle/design.md 测试策略)。
const HSL_TRIPLET = /^\d{1,3} \d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;

// terminal 系实测亦经 tailwind.config.ts hsl(var(--terminal-bg/fg)) 消费,
// 实施期修订(T5)一并纳入 HSL 守卫,不再豁免(design.md 修订版)。

// 从 tailwind.config.ts 提取 hsl(var(--x)) 消费的颜色变量名,保证守卫集合与实际消费同步
const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.ts');
const tailwindConfig = readFileSync(tailwindConfigPath, 'utf8');
const hslColorVars = new Set(
  [...tailwindConfig.matchAll(/hsl\(var\(--([a-z-]+)\)\)/g)].map(m => m[1]),
);

describe('theme css format guard', () => {
  const themesDir = path.join(projectRoot, 'src', 'web', 'themes');
  const themeFiles = readdirSync(themesDir).filter(f => f.endsWith('.css'));

  it('covers all theme css files', () => {
    expect(themeFiles).toContain('slate.css');
    expect(themeFiles).toContain('pixel.css');
  });

  for (const file of themeFiles) {
    it(`${file}: every hsl()-consumed color var is an HSL triplet`, () => {
      const css = readFileSync(path.join(themesDir, file), 'utf8');
      const colorDecls = [...css.matchAll(/--([a-z-]+):\s*([^;]+);/g)]
        .filter(([, name]) => hslColorVars.has(name));
      // 防止选择器/过滤条件失效导致空跑
      expect(colorDecls.length).toBeGreaterThan(0);

      const offenders = colorDecls
        .filter(([, , value]) => !HSL_TRIPLET.test(value.trim()))
        .map(([name, , value]) => `--${name}: ${value.trim()}`);
      expect(offenders).toEqual([]);
    });
  }
});
