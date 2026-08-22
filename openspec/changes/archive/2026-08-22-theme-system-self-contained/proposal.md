## Why

当前主题系统只覆盖了颜色、字体族、圆角、阴影和边框宽度，但**字号大小、图标集、间距**等仍散落在各组件里硬编码。结果是：调一个主题的视觉风格需要改十几处 `.tsx`，违背了"零组件改动换肤"的设计承诺。

## What Changes

1. **字号体系主题化**：新增 `--text-10/--text-11/--text-xs/--text-sm/--text-base/--text-lg` 变量，pixel/slate 可独立覆盖，default 保持基准值
2. **图标集架构重构**：引入"语义映射（ICON_MAP）+ 主题渲染器"架构，消除 per-theme 映射重复；每个主题只需提供渲染器函数，新增 icon key 只改一处，新增主题只加一个渲染器
3. **圆角/边框/阴影/高度变量补全**：组件里 `rounded-lg/rounded-full/rounded-md/rounded-[10px]`、`border-b`、`h-[52px]/h-[19px]` 等硬编码全部走变量
4. **组件 class 清理**：约 18 个文件、110+ 处硬编码 class 替换为变量引用
5. **Nord 主题替换为 Slate**：`nord.css` 重命名为 `slate.css`，全新冷灰蓝色调 + Phosphor Regular 图标风格

## Capabilities

### Modified Capabilities
- `dashboard-platform`: 主题系统 requirement 从"部分令牌化"升级为"全视觉令牌化"——字号、图标、圆角、边框、阴影、布局高度全部由主题变量驱动，实现真正的零组件改动换肤

## Impact

- 改动文件：约 22 个（`globals.css`、`pixel.css`、`slate.css`、`tailwind.config.ts`、`themes.ts`、`main.tsx`、`icons.tsx`、~15 个组件）
- 改动类型：纯前端 CSS/TSX 重构，无后端/API 变更
- 依赖变更：新增 `@phosphor-icons/react`，移除对 `@fontsource/vt323` 的直接 import（由 pixel.css 自行声明 @font-face）
- 向后兼容：主题切换行为不变，default 主题视觉保持不变；`nord` 主题替换为 `slate`
