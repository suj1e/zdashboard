# Design: 主题系统 v2

基于 main（2.4.0）。现状：`src/web/globals.css`（:root + [data-mode=dark] + [data-theme=pixel] + pixel-dark + pixel-dotgrid + dotgrid，共 173 行 6 块）；`themes.ts`（id 联合类型，单态 swatch）；`StyleSelect.tsx`（内嵌手绘 SVG，current 直读 DOM）；`tailwind.config.ts`（无 fontFamily/borderWidth 自定义）。

## Mode × Theme 契约

- mode 两值 dark/light，`data-mode`，太阳/月亮按钮——**正交维度，不进主题定义**
- theme 任意字符串 id，`data-theme`，注册表声明——扩展单位
- 主题在变量层按 mode 组合：`[data-theme="nord"][data-mode="dark"]` 等；这是 mode 正交在 CSS 的自然产物

## Phase 0 架构完善

### 0.1 主题 CSS 分文件

```
src/web/
├── globals.css          ← 只留 :root(=default/light) + [data-mode=dark](=default/dark) + .dot-grid 基础 + @import './themes/*.css'
└── themes/
    └── pixel.css        ← [data-theme=pixel] + [data-theme=pixel][data-mode=dark] + [data-theme=pixel] .dot-grid
```

- globals.css 的 @import 放顶部，主题文件随后覆盖（层叠优先级：机制块 < 主题块）
- pixel 块原样迁移，不动内容

### 0.2 字体令牌

```css
:root { --font-sans: var(--font-sans-default); --font-mono: var(--font-mono-default); }
```
- tailwind config `fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] }`
- default 两态同值（现字体栈）；pixel 覆盖 --font-mono

### 0.3 边框令牌

```css
:root { --border-width: 1px; }
```
- tailwind config `borderWidth: { DEFAULT: 'var(--border-width)', 2: '2px' }`（DEFAULT 挂变量让 border 类跟随；2 保留特例）
- pixel 覆盖 --border-width: 2px 即整站粗边框

### 0.4 themes.ts 放宽

```ts
export interface StyleDef { id: string; label: string; swatch: string[]; }
```
- 删联合类型；swatch 仍为单组主题代表色（4 色），菜单预览由 CSS 变量在当前 mode 下解析成色——不在注册表体现 mode
- ThemeSelect future: id 有效性与 CSS 是否存在解耦（loading 未知 id fallback default）

### 0.5 StyleSelect 改进

- 手绘 SVG → `import { Palette } from 'lucide-react'`
- `const [current, setCurrent] = useState(() => document.documentElement.dataset.theme ?? 'default')`；onClick 同步 setCurrent + dataset + localStorage（消除直读 DOM 的滞后渲染）

### 0.6 图标注册表 `src/web/lib/icons.ts`

```ts
import * as lucide from 'lucide-react';
import * as pixel from 'pixelarticons';   // 仅 pixel 主题
export function useIcons() { const t = useTheme(); return ICON_SETS[t] ?? ICON_SETS.default; }
```
- ICON_SETS: `{ default: { file: fileAtom, ... }, pixel: { ... } }`
- 覆盖三处集中映射的图标键 + EmptyState；内联装饰图标（按钮内 Play/Square 等）不纳入，记为设计边界
- 缺的 key fallback 到 default

## Phase 1 Pixel 补强

- pixel.css 加 `--border-width: 2px`（0.3 后纯变量）
- 装 `@fontsource/vt323`；pixel.css `--font-mono: 'VT323', var(--font-sans)`；font-family 栈式回退（中文回落 sans）
- 装 `pixelarticons`（3.1MB 包但依赖中）。构建按需 tree-shake，实际 bundle 增量 ~几十 KB；icons.ts 的 pixel 映射覆盖 file/dir/分组/首页 key

## Phase 2 Nord 示例（SOP 铁证）

- 新建 `src/web/themes/nord.css`：`[data-theme=nord]` + `[data-theme=nord][data-mode=dark]`，取值经 Nord palette：nord0 #2e3440、nord1 #3b4252、nord4 #d8dee9、frost 蓝 #5e81ac、aurora 绿 #a3be8c、红 #bf616a 等——映射进 background/foreground/card/primary/success/warning/info/destructive/border 全套，圆角阴影保持 default（调色板主题）
- themes.ts 加 `{ id: 'nord', label: 'Nord', swatch: ['#2e3440', '#5e81ac', '#a3be8c', '#d8dee9'] }`
- **验收铁证：git diff 此主题相关 = 1 个新 CSS 文件 + themes.ts 加 1 行，零 tsx**

## Phase 3 文档

- README「添加主题 SOP」小节：三步 + 约束清单（mode 正交不入主题定义；语义色必走令牌；装饰色豁免列；font-mono 类覆盖点）

## 明确不做

- 中文像素字体（体积，vt323 latin 绕开）
- 内联装饰图标主题化（记边界）
- 主题切换过渡动画
- StyleSelect hover 实时预览主题（交互模型存疑，待用户试用）

## 验证

1. tsc/build/vitest 全绿
2. Pixel 特征四件套：2px 边框（getComputedStyle borderWidth=2px）、vt323 mono（数字像素化截图）、像素图标三处、直角无阴影（v1 已验，回归）
3. Nord 零 tsx diff（git grep）
4. 每主题 × {dark, light} 全工作区（首页/view/design/bugs/review/apply/just）无漏色、像素/nord 下 Default 特征未串扰
5. 旧主题用户（zd-theme=pixel）升级后无缝（CSS 路径变更但选择器同名）
