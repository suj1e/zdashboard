## 1. 安装 Phosphor Icons 依赖

- [x] 1.1 执行 `pnpm add @phosphor-icons/react`，确认 package.json 和 pnpm-lock.yaml 更新

## 2. CSS 变量体系（globals.css）

- [x] 2.1 在 `globals.css` 的 `:root` 块添加字号变量：`--text-10: 10px`、`--text-11: 11px`、`--text-xs: 0.75rem`、`--text-sm: 0.875rem`、`--text-base: 1rem`、`--text-lg: 1.125rem`
- [x] 2.2 在 `globals.css` 的 `:root` 块添加圆角变量：`--radius-sm: 6px`、`--radius-md: 10px`、`--radius-lg: 14px`、`--radius-full: 9999px`
- [x] 2.3 在 `globals.css` 的 `:root` 块确认边框变量：`--border-width: 1px`
- [x] 2.4 在 `globals.css` 的 `:root` 块确认阴影变量：`--shadow-sm`、`--shadow-md`（已存在，确认无误）
- [x] 2.5 在 `globals.css` 的 `:root` 块添加布局变量：`--topbar-h: 52px`、`--statusbar-h: 28px`、`--chip-h: 19px`、`--icon-rail-w: 48px`
- [x] 2.6 验证 `globals.css` 语法正确（无重复声明、无冲突）

## 3. 主题文件

[x] 3.1 删除 `src/web/themes/nord.css`
[x] 3.2 创建 `src/web/themes/slate.css`，包含：
  - Slate light mode 颜色变量（slate-50 背景 / slate-900 字 / blue-500 primary）
  - Slate dark mode 颜色变量（slate-900 背景 / slate-50 字 / blue-400 primary）
  - Slate 字号覆盖：`--text-10: 11px`、`--text-11: 12px`、`--text-xs: 0.8rem`、`--text-sm: 0.95rem`、`--text-base: 1.1rem`、`--text-lg: 1.25rem`
  - Slate 圆角覆盖：`--radius-sm: 6px`、`--radius-md: 8px`、`--radius-lg: 12px`、`--radius-full: 9999px`
  - Slate 边框：`--border-width: 1px`（与 default 相同，显式声明）
[x] 3.3 更新 `src/web/themes/pixel.css`，添加新增变量的覆盖：
  - 字号：`--text-10: 12px`、`--text-11: 13px`、`--text-xs: 0.85rem`、`--text-sm: 1rem`、`--text-base: 1.15rem`、`--text-lg: 1.3rem`
  - 布局：`--topbar-h`、`--statusbar-h`、`--chip-h`、`--icon-rail-w`（pixel 可能需要不同尺寸）
[x] 3.4 验证 pixel.css 和 slate.css 语法正确

## 4. Tailwind 配置扩展

[x] 4.1 在 `tailwind.config.ts` 的 `theme.extend.fontSize` 添加：
  ```ts
  '10': ['var(--text-10)', { lineHeight: '1.5' }],
  '11': ['var(--text-11)', { lineHeight: '1.5' }],
  ```
[x] 4.2 确认 `tailwind.config.ts` 的 `theme.extend.fontSize` 中 `xs`/`sm`/`base`/`lg` 已使用 CSS 变量（如果尚未使用，更新之）
[x] 4.3 在 `tailwind.config.ts` 的 `theme.extend.borderRadius` 添加：
  ```ts
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  full: 'var(--radius-full)',
  ```
[x] 4.4 构建并验证 Tailwind 类生成正确（检查 dist 输出中 text-10/text-11/rounded-[var] 是否存在）

## 5. 图标集：icons.tsx（语义映射 + 渲染器架构）

### 5.1 定义语义映射（ICON_MAP）- 只定义一次

[x] 5.1.1 在 `icons.tsx` 中创建 `ICON_MAP: Record<IconKey, string>`，覆盖所有 IconKey：
  - FileExt：md→'FileText', ts→'Code', html→'Globe', json→'Braces', sh→'Terminal', svg→'Image', 等（复用现有 PIXEL_ICON_NAMES 的映射逻辑）
  - ViewGroup：group:changes→'ListTodo', group:archive→'Box', group:specs→'Shield', group:docs→'BookOpen', group:other→'Package'
  - DesignGroup：group:page→'Monitor', group:component→'Blocks', group:icon→'Shapes', group:token→'ColorsSwatch', group:md→'BookOpen', group:video→'Video', group:audio→'AudioWaveform', group:pdf→'FileText', group:font→'TextColumns'
  - EmptyState：empty:muted→'Inbox', empty:primary→'Sparkles'
  - RailKey：rail:home→'Home'
  - 新增通用图标：git-branch→'GitBranch', folder-open→'FolderOpen', play→'Play', square→'Square', rotate-cw→'RotateCw', eraser→'Eraser', check→'Check', palette→'Palette', moon→'Moon', sun→'Sun', package-open→'PackageOpen'
[x] 5.1.2 验证 ICON_MAP 覆盖所有 IconKey（无遗漏、无重复）

### 5.2 重构 defaultSet 为 defaultRenderer

[x] 5.2.1 删除现有的 `defaultSet: Record<IconKey, IconComponent>` 对象
[x] 5.2.2 创建 `defaultRenderer(name: string)` 函数：从 lucide-react 按名查找组件并渲染
[x] 5.2.3 验证 default 主题下所有图标正常显示

### 5.3 重构 pixelSet 为 pixelRenderer

[x] 5.3.1 删除现有的 `pixelSet: Record<IconKey, IconComponent>` 对象
[x] 5.3.2 创建 `pixelRenderer(name: string)` 函数：调用 `toPascal(name)` 后从 pixelReact 查找并渲染
[x] 5.3.3 验证 pixel 主题下所有图标正常显示

### 5.4 新增 slateRenderer（Phosphor Regular）

[x] 5.4.1 在 `icons.tsx` 顶部导入 Phosphor Regular 图标：
  ```ts
  import {
    GitBranch, FolderOpen, Play, Square, RotateCw, Eraser,
    Check, Palette, Moon, Sun, PackageOpen,
    FileText, Code, Globe, Braces, FileSpreadsheet, Terminal, Image,
    ListTodo, Boxes, ShieldCheck, BookOpen, Package,
    Monitor, Blocks, Shapes, Video, AudioLines,
    Inbox, Sparkles, Home,
  } from '@phosphor-icons/react';
  ```
[x] 5.4.2 创建 `slateRenderer(name: string)` 函数：从 phosphor 按名查找组件，渲染为 `<Cmp weight="regular" />`
[x] 5.4.3 验证 slate 主题下所有图标正常显示

### 5.5 重构 useIcons() hook

[x] 5.5.1 删除现有的 `ICON_SETS` 注册表对象
[x] 5.5.2 创建 `renderers` 对象：`{ default: defaultRenderer, pixel: pixelRenderer, slate: slateRenderer }`
[x] 5.5.3 重构 `useIcons()` 返回 `{ icon: (key: IconKey) => React.ReactNode }`：
  - 内部查 `ICON_MAP[key]` 得图标名
  - 交给当前主题的 renderer
  - 如果 renderer 返回 null，fallback 到 defaultRenderer
[x] 5.5.4 验证三个主题下 `useIcons().icon('md')` 等调用正常

### 5.6 清理旧代码

[x] 5.6.1 删除 `PIXEL_ICON_NAMES` 常量（已合并到 ICON_MAP）
[x] 5.6.2 删除 `toPascal` 函数（pixelRenderer 内部使用，保留但确认只在此使用）
[x] 5.6.3 确认 `defaultSet`、`pixelSet`、`slateSet` 旧对象已完全删除

## 6. 组件：字号 class 替换

### 6.1 StatusBar.tsx
[x] 6.1.1 第 8 行 CHIP 常量：`text-[10px]` → `text-10`（两处：font-mono text-[10px] 和 text-[10px]）
[x] 6.1.2 第 28 行 footer：`text-[11px]` → `text-11`
[x] 6.1.3 第 38 行 TooltipContent：`text-[10px]` → `text-10`
[x] 6.1.4 第 52 行 TooltipContent：`text-[10px]` → `text-10`

### 6.2 LogViewer.tsx
[x] 6.2.1 第 127 行：`text-[10px]` → `text-10`
[x] 6.2.2 第 167 行 Button：`text-[11px]` → `text-11`
[x] 6.2.3 第 169 行 Button：`text-[11px]` → `text-11`
[x] 6.2.4 第 175 行 p：`text-[11px]` → `text-11`
[x] 6.2.5 第 176 行 div：`text-[10px]` → `text-10`
[x] 6.2.6 第 186 行 div：`text-[11px]` → `text-11`
[x] 6.2.7 第 194 行 Button：`text-[11px]` → `text-11`
[x] 6.2.8 第 195 行 Button（两处）：`text-[11px]` → `text-11`
[x] 6.2.9 第 196 行 Button：`text-[11px]` → `text-11`

### 6.3 HomeGrid.tsx
[x] 6.3.1 第 32 行 external badge：`text-[10px]` → `text-10`
[x] 6.3.2 第 42 行 detect chips：`text-[11px]` → `text-11`
[x] 6.3.3 第 45 行 chip：确认 `font-mono` 保留（已走 --font-mono 变量）

### 6.4 CodeViewer.tsx
[x] 6.4.1 第 59 行 button：`text-[11px]` → `text-11`

### 6.5 MdViewer.tsx
[x] 6.5.1 第 29 行 button：`text-[11px]` → `text-11`

### 6.6 badge.tsx（ui 组件）
[x] 6.6.1 第 6 行：`text-[10px]` → `text-10`

### 6.7 其他组件确认
[x] 6.7.1 Topbar.tsx：`text-sm`/`text-xs` 保留（已走 Tailwind 变量映射）
[x] 6.7.2 IconRail.tsx：`text-sm`/`text-base` 保留
[x] 6.7.3 FilterPills.tsx：`text-xs` 保留
[x] 6.7.4 EmptyState.tsx：`text-sm`/`text-xs` 保留
[x] 6.7.5 ImageViewer.tsx：`text-xs` 保留
[x] 6.7.6 SidebarFrame.tsx：`text-sm` 保留

## 7. 组件：圆角 class 替换

### 7.1 IconRail.tsx
[x] 7.1.1 第 8 行 nav：`border-r` 保留（边框颜色走 --border 变量）
[x] 7.1.2 第 13 行 button：`rounded-lg` → `rounded-[var(--radius-lg)]`
[x] 7.1.3 第 27 行 button：`rounded-lg` → `rounded-[var(--radius-lg)]`

### 7.2 HomeGrid.tsx
[x] 7.2.1 第 23 行 card：`rounded-xl` → `rounded-[var(--radius-lg)]`（xl 不存在，映射到 lg）
[x] 7.2.2 第 28 行 icon box：`rounded-[10px]` → `rounded-[var(--radius-md)]`
[x] 7.2.3 第 32 行 external badge：`rounded-full` → `rounded-[var(--radius-full)]`
[x] 7.2.4 第 45 行 detect chip：`rounded-full` → `rounded-[var(--radius-full)]`
[x] 7.2.5 第 46 行 dot：`rounded-full` → `rounded-[var(--radius-full)]`

### 7.3 FilterPills.tsx
[x] 7.3.1 第 32 行 pill：`rounded-full` → `rounded-[var(--radius-full)]`

### 7.4 LogViewer.tsx
[x] 7.4.1 第 119 行 task card：`rounded-lg` → `rounded-[var(--radius-lg)]`（className 拼接中）
[x] 7.4.2 第 122 行 dot：`rounded-full` → `rounded-[var(--radius-full)]`
[x] 7.4.3 第 137 行 toolbar：`border-b` 保留（边框颜色走 --border 变量）
[x] 7.4.4 第 158 行 recipe card：`rounded-lg` → `rounded-[var(--radius-lg)]`
[x] 7.4.5 第 160 行 dot：`rounded-full` → `rounded-[var(--radius-full)]`

### 7.5 ProgressBar.tsx
[x] 7.5.1 第 11 行 outer：`rounded-full` → `rounded-[var(--radius-full)]`
[x] 7.5.2 第 12 行 inner：`rounded-full` → `rounded-[var(--radius-full)]`

### 7.6 EmptyState.tsx
[x] 7.6.1 第 10 行 icon box：`rounded-[16px]` → `rounded-[var(--radius-lg)]`

### 7.7 StopButton.tsx
[x] 7.7.1 第 18 行 icon box：`rounded-[14px]` → `rounded-[var(--radius-md)]`

### 7.8 button.tsx（ui 组件）
[x] 7.8.1 第 24 行 sm variant：`rounded-md` → `rounded-[var(--radius-md)]`

### 7.9 tooltip.tsx（ui 组件）
[x] 7.9.1 第 21 行：`rounded-md` → `rounded-[var(--radius-md)]`

### 7.10 dropdown-menu.tsx（ui 组件）
[x] 7.10.1 第 39 行 item：`rounded-sm` → `rounded-[var(--radius-sm)]`

### 7.11 StyleSelect.tsx
[x] 7.11.1 第 36 行 swatch：`rounded-sm` → `rounded-[var(--radius-sm)]`

### 7.12 MdViewer.tsx
[x] 7.12.1 第 29 行 copy button：`rounded` → `rounded-[var(--radius-md)]`
[x] 7.12.2 第 33 行 pre：`rounded-md` → `rounded-[var(--radius-md)]`
[x] 7.12.3 第 60 行 details：`rounded` → `rounded-[var(--radius-md)]`

### 7.13 CodeViewer.tsx
[x] 7.13.1 第 59 行 copy button：`rounded` → `rounded-[var(--radius-md)]`

### 7.14 badge.tsx（ui 组件）
[x] 7.14.1 第 6 行：`rounded` → `rounded-[var(--radius-sm)]`

### 7.15 scroll-area.tsx（ui 组件）
[x] 7.15.1 第 41 行 thumb：`rounded-full` → `rounded-[var(--radius-full)]`

### 7.16 其他确认
[x] 7.16.1 Topbar.tsx：`rounded-full`（status dot）→ `rounded-[var(--radius-full)]`
[x] 7.16.2 SidebarFrame.tsx：`shadow-lg` 保留（阴影变量已定义，pixel 覆盖为 none）
[x] 7.16.3 ImageViewer.tsx：zoom 按钮 `rounded` → `rounded-[var(--radius-md)]`

## 8. 组件：布局高度/宽度替换

### 8.1 Topbar.tsx
[x] 8.1.1 第 12 行 header：`h-[52px]` → `h-[var(--topbar-h)]`

### 8.2 StatusBar.tsx
[x] 8.2.1 第 8 行 CHIP 常量：`h-[19px]` → `h-[var(--chip-h)]`
[x] 8.2.2 第 28 行 footer：`h-7` → `h-[var(--statusbar-h)]`

### 8.3 IconRail.tsx
[x] 8.3.1 第 8 行 nav：`w-12` → `w-[var(--icon-rail-w)]`

### 8.4 其他确认
[x] 8.4.1 LogViewer.tsx：`h-8`（toolbar）保留（标准 Tailwind 高度，非主题特定）
[x] 8.4.2 HomeGrid.tsx：`h-9`/`w-9`（icon box）保留（标准尺寸）
[x] 8.4.3 button.tsx：`h-9`/`h-10`/`h-6` 保留（标准按钮尺寸）

## 9. 组件：硬编码图标路由到 useIcons()

useIcons() 新 API：`const { icon } = useIcons()` 返回 `icon(key: IconKey) => React.ReactNode`，直接渲染图标组件。

### 9.1 StatusBar.tsx
[x] 9.1.1 移除 `import { GitBranch, FolderOpen } from 'lucide-react'`
[x] 9.1.2 添加 `import { useIcons } from '../lib/icons.js'`
[x] 9.1.3 在组件内调用 `const { icon } = useIcons()`
[x] 9.1.4 第 37 行 `<GitBranch className="..." />` → `{icon('git-branch')}`（需确认 props 传递方式）
[x] 9.1.5 第 44 行 `<FolderOpen className="..." />` → `{icon('folder-open')}`

### 9.2 LogViewer.tsx
[x] 9.2.1 移除 `import { Play, Square, RotateCw, Eraser } from 'lucide-react'`
[x] 9.2.2 添加 `import { useIcons } from '../lib/icons.js'`
[x] 9.2.3 在组件内调用 `const { icon } = useIcons()`
[x] 9.2.4 第 161 行 `<Play className="h-2.5 w-2.5" />` → `{icon('play')}`（需包装 span 传递 className）
[x] 9.2.5 第 164 行 `<Square className="h-2.5 w-2.5" />` → `{icon('square')}`
[x] 9.2.6 第 165 行 `<RotateCw className="h-2.5 w-2.5" />` → `{icon('rotate-cw')}`
[x] 9.2.7 第 166 行 `<Eraser className="h-2.5 w-2.5" />` → `{icon('eraser')}`

### 9.3 StyleSelect.tsx
[x] 9.3.1 移除 `import { Check, Palette } from 'lucide-react'`
[x] 9.3.2 添加 `import { useIcons } from '../lib/icons.js'`
[x] 9.3.3 在组件内调用 `const { icon } = useIcons()`
[x] 9.3.4 第 36 行 swatch check：`<Check className="h-3 w-3" />` → `{icon('check')}`
[x] 9.3.5 第 25 行 button icon：`<Palette className="h-4 w-4" />` → `{icon('palette')}`

### 9.4 ThemeToggle.tsx
[x] 9.4.1 移除 `import { Moon, Sun } from 'lucide-react'`
[x] 9.4.2 添加 `import { useIcons } from '../lib/icons.js'`
[x] 9.4.3 在组件内调用 `const { icon } = useIcons()`
[x] 9.4.4 Moon/Sun 按钮：`<Moon className="h-4 w-4" />` / `<Sun className="h-4 w-4" />` → `{icon('moon')}` / `{icon('sun')}`

### 9.5 PlaceholderWorkspace.tsx
[x] 9.5.1 移除 `import { PackageOpen } from 'lucide-react'`
[x] 9.5.2 添加 `import { useIcons } from '../lib/icons.js'`
[x] 9.5.3 在组件内调用 `const { icon } = useIcons()`
[x] 9.5.4 第 7 行：`icon={PackageOpen}` → `icon={() => icon('package-open')}`（或根据 EmptyState prop 类型调整）

### 9.6 组件 Props 传递说明

useIcons() 渲染的图标组件需要接收 className/size 等 props。有两种方式：
- A. icon() 返回的 ReactNode 已包含 className（在 renderer 中注入）
- B. icon() 返回组件，由调用方包裹 span 传递 className

选择 B（更灵活），需要调整组件代码：
```tsx
// 之前
<GitBranch className="h-4 w-4" />

// 之后
<span className="h-4 w-4">{icon('git-branch')}</span>
```

### 9.7 确认点
[x] 9.7.1 EmptyState.tsx：确认 EmptyState 接收 Icon 作为 prop，由调用方通过 useIcons() 传入（无需修改 EmptyState.tsx 本身）
[x] 9.7.2 FileIcon.tsx：确认 FileIcon.tsx 已通过 useIcons() 渲染图标（无需修改）
[x] 9.7.3 IconRail.tsx：确认 IconRail 的 icon 来自 plugin manifest（字符串），通过 useIcons 渲染（无需修改）

## 10. 注册表文件更新

### 10.1 themes.ts
[x] 10.1.1 将 STYLES 数组中的 `{ id: 'nord', ... }` 替换为 `{ id: 'slate', label: 'Slate', swatch: ['#f8fafc', '#e2e8f0', '#3b82f6', '#0f172a'] }`
[x] 10.1.2 删除或注释掉所有 nord 相关引用

### 10.2 main.tsx
[x] 10.2.1 将 `import './themes/nord.css'` 替换为 `import './themes/slate.css'`
[x] 10.2.2 确认 `import '@fontsource/vt323/latin.css'` 已移除（由 pixel.css 自行声明 @font-face）

## 11. 构建验证

[x] 11.1 执行 `pnpm build`，确认无构建错误
[x] 11.2 启动 `node dist/cli.js --dir . --port 4190`，确认服务正常启动
[x] 11.3 浏览器访问 `http://localhost:4190`，确认页面加载正常
[x] 11.4 切换到 default 主题，确认视觉与重构前一致（回归验证）
[x] 11.5 切换到 pixel 主题，确认：
  - VT323 字体生效且 size-adjust 生效
  - 字号放大（text-10=12px, text-11=13px, text-xs=0.85rem）
  - 全直角（radius=0）
  - 加粗边框（border-width=2px）
  - 无阴影
  - pixelarticons 图标生效
[x] 11.6 切换到 slate 主题，确认：
  - Inter 字体生效
  - 字号略大于 default（text-10=11px, text-xs=0.8rem）
  - 圆角 moderate（sm=6px, md=8px, lg=12px）
  - Phosphor Regular 图标生效
  - 冷灰蓝色调正确
[x] 11.7 明暗切换验证：在 pixel/slate/default 各主题下切换 dark/light，确认颜色和风格特征保持不变
[x] 11.8 SSE reload 验证：修改任意文件，确认页面自动刷新且不循环闪屏
[x] 11.9 导航验证：点击各插件 IconRail 图标，确认导航正常，图标随主题切换

## 12. OpenSpec 更新

[x] 12.1 确认 proposal.md 中 Nord → Slate 已更新
[x] 12.2 确认 design.md 中 Nord → Slate 已更新
[x] 12.3 确认 tasks.md 中 Nord → Slate 已更新
[x] 12.4 运行 `openspec validate --change theme-system-self-contained` 确认通过
