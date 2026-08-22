## Why

全站约 180 处风格决策散落在 className（语义色硬编码 78 处、圆角字面量 57、阴影 16、半透明 17、lucide 直接 import 19 文件、点阵内联复制 2、动效散落 13）——换一套主题需全量 grep 逐处人工判断，主题能力名存实亡（现仅暗/亮二态 class 切换）。需要把风格决策收敛进令牌 + data-theme 机制，使"新增主题 = 一个 CSS 变量块，零组件改动"。

## What Changes

### Phase 1 令牌完备化（还债）

- 语义色进令牌：globals.css 定义 `--success/--warning/--info`（destructive 已有），tailwind config 映射 `success/warning/info`；全站 78 处 `text-emerald-*/text-amber-*/text-sky-*`（含 bg-/border-）脚本替换为语义令牌类
- 圆角令牌四档：`--radius-sm/md/lg/full`，57 处字面量替换（`rounded-full→rounded-full`映射到令牌等）
- 阴影令牌：`--shadow-sm/md`；点阵背景收成一个 CSS 类 `dot-grid`（替换 App/design 两处内联 style）
- 半透明混色（17 处）与动效词汇（13 处）：保留现状但在 pixel 主题下用 CSS 覆盖验证不发灰（超出范围的记入设计说明）

### Phase 2 双维度主题机制

**明暗（mode）与风格（style）为正交维度**——dark/light 不是主题，是每个风格都有的两态：
- `html[data-mode]`（dark/light）控制明暗中性色板（现有太阳/月亮按钮保留为模式切换入口，迁移旧 `zdashboard-theme`）
- `html[data-theme]`（default/pixel/…）控制风格：独立一个 Topbar 按钮（Palette 图标下拉，swatch 预览）供用户选择
- `src/web/lib/themes.ts` 风格注册表：`{ id, label, swatch: string[] }[]`（仅风格，明暗不在表内），加风格只改此表+一个 CSS 块
- globals.css：`[data-theme="pixel"]` 风格覆盖（实色调色板/radius 0/shadow none/点阵加强）× `[data-mode]` 明暗组合选择器（pixel 亦有亮色版）

### Phase 3 入口与验收

- Topbar：保留明暗切换按钮 + 新增独立风格选择按钮（DropdownMenu + swatch + Check）；存储 `zd-mode` + `zd-theme` 两个 key
- **验收标准：pixel 风格仅由 CSS 变量块+注册表实现，零组件改动**；{dark,light}×{default,pixel} 四组合全工作区走查无漏色

## Capabilities

### New Capabilities

- `theme-system`：令牌完备化、data-theme 机制、主题注册表与选择器、pixel 试验主题

### Modified

- `dashboard-platform`：Topbar 主题入口从二态开关升级为主题选择器
