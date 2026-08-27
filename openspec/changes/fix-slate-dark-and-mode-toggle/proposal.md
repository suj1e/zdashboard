# 提案:slate 主题色彩格式修复 + 明暗切换状态修复(fix-slate-dark-and-mode-toggle)

## 需求复述

修复两个 zapply batch 2026-08-27-1946 期间如实上报的基线既有缺陷:

1. **slate 主题色彩变量格式错误**:`src/web/themes/slate.css` 的 --background/--foreground/--card/--popover/--primary/--secondary/--muted/--accent/--destructive-foreground 之外的主色全部使用 RGB 三元组(如 `--background: 15 23 42`),而全局消费端统一是 `hsl(var(--x))`(globals.css:109)。结果:slate 深色渲染成棕橙色(HSL 语义下 15 23 42 被解析为 h=15 s=23% l=42%);浅色因 hsl 饱和度/亮度 clamp 碰巧接近白色而未被察觉,但前景/边框等同样失真。
2. **ThemeToggle 陈旧闭包**:`src/web/components/ThemeToggle.tsx` 在 render 时读 `document.documentElement.dataset.mode`,toggle 只写 dataset+localStorage 不触发重渲染 → 图标不翻转;连续快速点击会基于陈旧 mode 计算 next,偶发不翻转。

## 要解决的问题

- slate 主题(含明暗两套)视觉失真,三主题体系(default/nord?/pixel/slate)中 slate 不可用。
- 明暗切换控件在快速操作下状态与图标/实际 mode 脱节。

## 成功标准

1. slate.css 中所有被 `hsl(var(--x))` 消费的颜色变量一律为 HSL 三元组格式(`H S% L%`);RGB 格式清零(terminal-bg/fg 除外——其消费端为 `rgb(var(--terminal-bg))`,格式正确,不动)。
2. slate 深色/浅色在浏览器下背景/前景/边框/主色观感为冷灰蓝调(与 token 语义一致),无明显偏色。
3. ThemeToggle:每次点击图标与 dataset.mode 正确翻转;连点 N 次最终状态与点击次数奇偶一致(React 状态驱动,无陈旧读)。
4. `pnpm test` / `pnpm typecheck` / `pnpm build` 全绿;pixel.css 如存在同类问题一并修复(audit 结论写入报告)。

## 非目标

- 不新增主题、不改 default(globals.css 内建 token)与 pixel 主题的既有正确值。
- 不改主题切换的存储键与初始化逻辑(main.tsx)。

## 依赖

- 无前置(基于 plugin-platform 三 change 归档后的 main)。

## 优先级

- P1:视觉缺陷影响 slate 主题可用性;体量小,随平台收尾批次顺带交付。
