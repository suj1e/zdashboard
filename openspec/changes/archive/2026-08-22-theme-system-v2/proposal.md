## Why

主题系统 v1 建立了双维度机制（mode：dark/light 正交 × theme：default/pixel），但审计发现 7 处债使其**未来加主题不干净**：CSS 单文件堆积、注册表 id 硬编码联合类型、字体零令牌、borderWidth 未令牌化、图标库不可换、StyleSelect 手绘 SVG、无 SOP 文档。同时 Pixel 主题名不副实——只有"换色+直角+去阴影"，缺像素字体/粗边框/像素图标三件灵魂特征。

## What Changes

### Mode × Theme 术语（本项目契约）

- **mode**（dark/light）：明暗中性色板，太阳/月亮按钮切换，`data-mode` 驱动，**与主题正交**
- **theme**（default/pixel/nord/…）：风格包，Palette 下拉选择，`data-theme` 驱动，注册表声明，**扩展单位**
- 一个 theme 定义其变量在 dark 与 light 两种 mode 下的取值（CSS 层组合选择器），这是 mode 正交性在变量层的体现，不是"theme 含 mode"

### Phase 0 架构完善（还债）

- theme CSS 分文件：globals.css 只留 default（:root + [data-mode=dark]）与 .dot-grid 基础；pixel 抽 `src/web/themes/pixel.css`
- 字体令牌 `--font-sans/--font-mono` + tailwind fontFamily 挂变量（font-mono 已被 14 文件使用，为像素字体留承接点）
- 边框令牌 `--border-width` + tailwind borderWidth 挂变量
- themes.ts：`id: string`（删 'default'|'pixel' 联合）；swatch 代表色（无 mode 概念，菜单预览由 CSS 变量在当前 mode 下自然成色）
- StyleSelect：手绘 SVG → lucide `Palette`；current 改 React state（切换后选中态即时刷新）
- icon registry：`src/web/lib/icons.ts` 集中导出当前主题图标集（default=lucide 现状），覆盖三处集中映射 + EmptyState；内联装饰图标不纳入（记边界）

### Phase 1 Pixel 补强

- 粗边框 `--border-width: 2px`
- 像素 mono 字体：装 `@fontsource/vt323`（87KB latin），pixel.css 覆盖 `--font-mono`，font-family 栈式回退 `vt323, var(--font-sans)` —— StatusBar 时长/退出码、路径、代码区数字像素化，中文正文保留 sans
- 像素图标：装 `pixelarticons`，registry 的 pixel 映射覆盖 FileIcon + GRUP_ICON×2 + rail 首页；缺口 fallback lucide

### Phase 2 新增主题（SOP 活验证）

- **Nord**：调色板主题（保留圆角阴影），严格走 SOP 三步（CSS 文件 + 注册表条目），**git diff 零 tsx 铁证**

### Phase 3 文档

- README「添加主题 SOP」：三步 + 约束（mode 正交不入主题定义、语义色走令牌、装饰色豁免清单）

## Capabilities

### New Capabilities

- `theme-system-v2`：主题架构完善（分文件/字体令牌/边框令牌/图标注册表）、Pixel 补强、新增主题 SOP 机制

### Modified

- `dashboard-platform`：主题注册表（id 放宽为字符串）、Topbar 风格选择器改进（lucide Palette + React state）
