## Context

当前主题系统已实现颜色/字体族/圆角/阴影/边框宽度的 CSS 变量化，但以下视觉属性仍散落在组件中硬编码：

- 字号：`text-[10px]`、`text-[11px]`、`h-[52px]`、`h-[19px]` 等（~20 处）
- 圆角：`rounded-lg`、`rounded-full`、`rounded-md`、`rounded-[10px]`、`rounded-[14px]`、`rounded-[16px]`（~15 处）
- 图标：Topbar/StatusBar/LogViewer/StyleSelect/ThemeToggle/PlaceholderWorkspace 直接 import lucide（~8 处）
- 布局高度：`h-[52px]`（Topbar）、`h-[19px]`（chip）、`w-12`（IconRail）等
- 间距：`px-2.5`、`py-1.5` 等（部分保留为 Tailwind 默认值）

结果是：调整 pixel 主题字号需手动改十几个组件，违背了"零组件改动换肤"原则。

## Goals / Non-Goals

**Goals:**
- 所有视觉属性（字号、圆角、边框、阴影、图标、关键布局尺寸）由主题变量/注册表驱动
- 组件代码不含任何主题特定的硬编码值
- 新增/修改主题只需改 CSS 文件 + 注册表条目 + 可选图标映射表
- 用 Slate 主题替换 Nord，搭配 Phosphor Regular 图标集

**Non-Goals:**
- 不改 Tailwind 默认 scale（保留 text-xs=12px 等基准）
- 不引入新依赖（除 @phosphor-icons/react 外）
- 不改后端/API
- 间距（px/py）不纳入主题变量（主题间差异不大，Tailwind spacing scale 足够）

## Decisions

### D1: 字号用 CSS 变量 + Tailwind fontSize 扩展

```css
/* globals.css :root */
--text-10: 10px;
--text-11: 11px;
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */

/* tailwind.config.ts */
fontSize: {
  '10': ['var(--text-10)', { lineHeight: '1.5' }],
  '11': ['var(--text-11)', { lineHeight: '1.5' }],
  'xs': ['var(--text-xs)', { lineHeight: '1.5' }],
  'sm': ['var(--text-sm)', { lineHeight: '1.5' }],
  'base': ['var(--text-base)', { lineHeight: '1.6' }],
  'lg': ['var(--text-lg)', { lineHeight: '1.4' }],
}
```

组件改法：`text-[10px]` → `text-10`，`text-[11px]` → `text-11`，`text-xs`/`text-sm` 保留不动（自动走变量）。

**Rationale:** Tailwind 的 `fontSize` 配置支持 CSS 变量，组件只需改 class 名，不需拆 font-size/line-height。`text-10`/`text-11` 作为自定义 token 纳入变量体系，pixel/slate 可独立缩放。

**Alternatives considered:**
- `text-[length:var(--text-10)]`：Tailwind v3 支持但语法冗长，且需手动补 line-height
- 根元素 `font-size` 缩放：只影响 rem，不影响硬编码 px，覆盖不全

### D2: 圆角用 CSS 变量 + arbitrary values

```css
/* globals.css :root */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-full: 9999px;

/* 组件 */
rounded-lg   → rounded-[var(--radius-lg)]
rounded-full → rounded-[var(--radius-full)]
rounded-md   → rounded-[var(--radius-md)]
rounded-sm   → rounded-[var(--radius-sm)]
rounded-[10px] → rounded-[var(--radius-md)]
rounded-[14px] → rounded-[var(--radius-md)]
rounded-[16px] → rounded-[var(--radius-lg)]
```

**Rationale:** Tailwind 的 `rounded-[<value>]` 支持任意 CSS 值，包括 `var()`。组件只需改 class 名。

**Alternatives considered:**
- 在 tailwind.config.ts 扩展 `borderRadius`：可行，但 `rounded-[10px]` 这种单次使用的值仍需要 arbitrary value，不如统一用变量

### D3: 边框宽度保留变量 + arbitrary value

```css
/* globals.css :root */
--border-width: 1px;

/* 组件 */
border → border-[var(--border-width)]
```

pixel 主题覆盖为 `2px`，slate/default 保持 `1px`。

### D4: 图标集走注册表 + 渲染器（非硬编码映射）

当前 `icons.tsx` 每个主题都手写一套完整映射（`defaultSet`、`pixelSet`），新增主题要复制全部映射。改为：

```ts
// 1. 语义映射：定义一次，永不随主题变化
const ICON_MAP: Record<IconKey, string> = {
  md: 'FileText', ts: 'Code', html: 'Globe',
  'group:changes': 'ListTodo', 'group:archive': 'Box',
  // ... 一套完整的 key → 图标语义名
};

// 2. 主题渲染器：每个主题只提供"按名查组件"的能力
const renderers = {
  default: (name: string) => {
    const Cmp = lucide[name as keyof typeof lucide];
    return Cmp ? <Cmp /> : null;
  },
  pixel: (name: string) => {
    const Cmp = pixelReact[toPascal(name)];
    return Cmp ? <Cmp /> : null;
  },
  slate: (name: string) => {
    const Cmp = phosphor[name as keyof typeof phosphor];
    return Cmp ? <Cmp weight="regular" /> : null;
  },
};

// 3. useIcons 返回 icon(key) 函数
export function useIcons() {
  const theme = useTheme();
  const render = renderers[theme] ?? renderers.default;
  return {
    icon: (key: IconKey) => {
      const name = ICON_MAP[key];
      if (!name) return null;
      return render(name);
    }
  };
}
```

**效果：**
- 语义映射只定义一次（`ICON_MAP`），新增 icon key 只需加一行
- 每个主题只需提供渲染器函数，无需复制映射表
- 缺失图标自动 fallback 到 default 主题渲染器
- 新增主题只需加一个渲染器，零映射工作

**Rationale:** 消除主题间的映射重复，将"语义名→组件"与"组件→渲染"解耦。

**Alternatives considered:**
- 保留当前 per-theme 映射表：功能等价但重复工作量大，新增 icon key 要改三处
- CSS `content` 换图标：不可行，SVG 图标需 React 组件

### D5: 布局高度变量化

关键布局高度纳入主题变量：
```css
--topbar-h: 52px;
--chip-h: 19px;
--icon-rail-w: 48px; /* w-12 */
```

组件改法：`h-[52px]` → `h-[var(--topbar-h)]`，`h-[19px]` → `h-[var(--chip-h)]`，`w-12` → `w-[var(--icon-rail-w)]`。

**Rationale:** Slate 主题可能需要更紧凑或更宽松的布局，通过变量控制而非硬编码。

### D6: 间距保留 Tailwind 默认

`px-2.5`、`py-1.5`、`gap-2` 等间距不纳入主题变量。主题间的间距差异通常不大，且 Tailwind 的 spacing scale 已经足够表达。如需主题差异化，后续再加。

## Slate 主题定义

```
slate.css 视觉体系：
├── 字体族：Inter（Google Fonts，干净几何，和 Phosphor 气质一致）
├── 字号：基准值略大于 default（text-xs: 0.8rem, text-sm: 0.95rem, text-base: 1.1rem）
├── 颜色：冷灰蓝色调
│   ├── background: #f8fafc (slate-50)
│   ├── foreground: #0f172a (slate-900)
│   ├── primary: #3b82f6 (blue-500)
│   ├── secondary: #e2e8f0 (slate-200)
│   ├── muted: #f1f5f9 (slate-100)
│   ├── accent: #dbeafe (blue-100)
│   ├── border: #cbd5e1 (slate-300)
│   └── ring: #3b82f6 (blue-500)
├── 圆角：8-10px（moderate，友好但不圆润）
│   ├── --radius-sm: 6px
│   ├── --radius-md: 8px
│   ├── --radius-lg: 12px
│   └── --radius-full: 9999px
├── 边框宽度：1px
├── 阴影：subtle elevation（保留 shadow-sm/shadow-md）
└── 图标：Phosphor Regular
```

dark mode：
```
├── background: #0f172a (slate-900)
├── foreground: #f8fafc (slate-50)
├── primary: #60a5fa (blue-400)
├── secondary: #1e293b (slate-800)
├── muted: #1e293b (slate-800)
├── accent: #1e3a5f (blue-900)
├── border: #334155 (slate-700)
└── ring: #60a5fa (blue-400)
```

## 全局变量清单（globals.css :root）

```css
/* 字号 */
--text-10: 10px;
--text-11: 11px;
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;

/* 圆角 */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-full: 9999px;

/* 边框 */
--border-width: 1px;

/* 阴影 */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* 布局 */
--topbar-h: 52px;
--chip-h: 19px;
--icon-rail-w: 48px;
```

pixel.css 覆盖：
```css
--text-10: 12px;
--text-11: 13px;
--text-xs: 0.85rem;
--text-sm: 1rem;
--text-base: 1.15rem;
--text-lg: 1.3rem;
--radius-sm/md/lg: 0px;
--radius-full: 0px;
--border-width: 2px;
--shadow-sm: none;
--shadow-md: none;
```

slate.css 覆盖：
```css
--text-10: 11px;
--text-11: 12px;
--text-xs: 0.8rem;
--text-sm: 0.95rem;
--text-base: 1.1rem;
--text-lg: 1.25rem;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
--border-width: 1px;
/* 阴影保持默认 */
```

## Risks / Trade-offs

- **Risk:** `rounded-[var(--radius-lg)]` 在 SSR/静态生成时可能产生 hydration mismatch
  - **Mitigation:** 本项目为纯 CSR SPA，无 SSR，不存在此问题

- **Risk:** pixel 主题下 VT323 字体加载延迟导致 FOIT
  - **Mitigation:** `font-display: swap` 已声明；`size-adjust` 在 `@font-face` 中

- **Risk:** Phosphor 图标包体积较大，tree-shaking 可能不彻底
  - **Mitigation:** 使用命名导入（`import { IconName } from '@phosphor-icons/react'`），Vite/Rollup 可 tree-shake；图标映射表中只导入实际使用的图标

## Migration Plan

1. 在 `globals.css` 的 `:root` 声明全量默认变量（字号、圆角、边框、阴影、布局）
2. 将 `nord.css` 重命名为 `slate.css` 并重新设计 Slate 主题
3. 在 `pixel.css` / `slate.css` 覆盖对应变量
4. 扩展 `tailwind.config.ts` 的 `fontSize` / `borderRadius` 映射
5. 安装 `@phosphor-icons/react`
6. 补充 `slateSet` 图标集到 `icons.tsx`
7. 批量替换组件 class（~18 文件，~110 处）
8. 路由所有硬编码图标到 `useIcons()`
9. 更新 `themes.ts` / `main.tsx` 注册表
10. 构建启动验证

## Open Questions

（已解决）
- ~~Nord 图标集风格~~ → 删除 Nord，替换为 Slate + Phosphor Regular
- ~~pixel 主题下 text-[10px]/text-[11px] 是否放大~~ → 是，全部纳入变量体系
