## Why

全站约 180 处风格决策散落在 className（语义色硬编码 78 处、圆角字面量 57、阴影 16、半透明 17、lucide 直接 import 19 文件、点阵内联复制 2、动效散落 13）——换一套主题需全量 grep 逐处人工判断，主题能力名存实亡（现仅暗/亮二态 class 切换）。需要把风格决策收敛进令牌 + data-theme 机制，使"新增主题 = 一个 CSS 变量块，零组件改动"。

## What Changes

### Phase 1 令牌完备化（还债）

- 语义色进令牌：globals.css 定义 `--success/--warning/--info`（destructive 已有），tailwind config 映射 `success/warning/info`；全站 78 处 `text-emerald-*/text-amber-*/text-sky-*`（含 bg-/border-）脚本替换为语义令牌类
- 圆角令牌四档：`--radius-sm/md/lg/full`，57 处字面量替换（`rounded-full→rounded-full`映射到令牌等）
- 阴影令牌：`--shadow-sm/md`；点阵背景收成一个 CSS 类 `dot-grid`（替换 App/design 两处内联 style）
- 半透明混色（17 处）与动效词汇（13 处）：保留现状但在 pixel 主题下用 CSS 覆盖验证不发灰（超出范围的记入设计说明）

### Phase 2 主题机制

- `html[data-theme]` 驱动（替代现 `dark` class 特例，dark/light 各为一个 data-theme 值，向后兼容读旧 `zdashboard-theme` 迁移）
- `src/web/lib/themes.ts` 主题注册表：`{ id, label, swatch: string[] }[]`，加主题只改此表+一个 CSS 块
- globals.css 内 `[data-theme="pixel"]` 覆盖层：4-8 色实色调板、radius 全 0、阴影清除、点阵加强

### Phase 3 入口与验收

- ThemeToggle 升级为主题选择器：shadcn DropdownMenu + 每主题色板 swatch 预览，localStorage `zd-theme` 持久化
- **验收标准：pixel 主题仅由 CSS 变量块实现，零组件改动**；暗/亮/像素三主题全工作区走查无漏色

## Capabilities

### New Capabilities

- `theme-system`：令牌完备化、data-theme 机制、主题注册表与选择器、pixel 试验主题

### Modified

- `dashboard-platform`：Topbar 主题入口从二态开关升级为主题选择器
