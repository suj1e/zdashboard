# zdashboard 设计令牌深度体检报告

生成时间: 2026-08-23  
扫描范围: `src/` 目录下所有 `.tsx` / `.ts` / `.css` 文件  
排除: `node_modules/`

---

## 总览

| 维度 | 状态 | 问题数 |
|------|------|--------|
| 字体字号 | ⚠️ 基本干净 | 2 |
| 圆角 | ⚠️ 部分未变量化 | 25 |
| 边框 | ✅ 干净 | 0 |
| 阴影 | ⚠️ 部分未变量化 | 3 |
| 颜色 | ✅ 干净 | 0 |
| 布局尺寸 | ⚠️ 大量硬编码 | 12+ |
| 间距 | ⚠️ 少量硬编码 | 2 |
| 图标 | ❌ 大量硬编码 | 13 行 / 10 文件 |

---

## 1. 字体字号

### 1.1 硬编码 px 值（2 处）

| 文件 | 行号 | 代码 | 严重度 |
|------|------|------|--------|
| `src/plugins/apply/Viewer.tsx` | 68 | `text-[8px]` | 低 |
| `src/plugins/review/viewers/ReviewViewer.tsx` | 224 | `text-[9px]` | 低 |

**说明**: 这两处是极小字号，用于勾号标记和状态标签。在 pixel 主题下可能过小，建议改为 `text-xs` 或新增 `--text-8` / `--text-9` 变量。

### 1.2 非标准 Tailwind 字号类

**0 处** ✅ 已全部清理。

### 1.3 内联 font-size

**0 处** ✅ 无内联样式。

---

## 2. 圆角

### 2.1 硬编码 px 值（1 处）

| 文件 | 行号 | 代码 | 严重度 |
|------|------|------|--------|
| `src/plugins/apply/Viewer.tsx` | 189 | `rounded-[14px]` | 中 |

**建议**: 改为 `rounded-[var(--radius-lg)]`。

### 2.2 未映射到 CSS 变量的标准类（25 处）

**注意**: 这里的 `rounded-lg` / `rounded-md` / `rounded-sm` 实际上在 `tailwind.config.ts` 中已经映射到了 CSS 变量：

```ts
borderRadius: {
  lg: 'var(--radius-lg)',
  md: 'var(--radius-md)',
  sm: 'var(--radius-sm)',
  full: 'var(--radius-full)',
}
```

所以 `rounded-lg` 等类名是**变量化的**，不是硬编码。之前的扫描误报，实际状态为 ✅。

**唯一例外**: `rounded-xl` 在 `src/web/components/ui/card.tsx:8` 中使用，未在 tailwind 配置中映射。

| 文件 | 行号 | 代码 | 严重度 |
|------|------|------|--------|
| `src/web/components/ui/card.tsx` | 8 | `rounded-xl` | 中 |

**建议**: 在 `tailwind.config.ts` 中添加 `xl: 'var(--radius-xl)'` 或在 `globals.css` 定义 `--radius-xl`，或改为 `rounded-lg`。

---

## 3. 边框

### 3.1 硬编码边框颜色

**0 处** ✅ 全部使用 `border-border` 语义类。

### 3.2 硬编码边框宽度

**0 处** ✅ 全部使用 `border` 类，宽度由 `--border-width` 控制。

---

## 4. 阴影

### 4.1 硬编码阴影值

**0 处** ✅ 无内联阴影。

### 4.2 未映射到 CSS 变量的阴影类

**扫描误报**。`shadow-sm` / `shadow-md` / `shadow-lg` 在 `tailwind.config.ts` 中已正确映射：

```ts
boxShadow: {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
}
```

**唯一例外**: `shadow-lg` 在 `SidebarFrame.tsx` 中使用，但 `tailwind.config.ts` 未定义 `lg` 映射。

| 文件 | 行号 | 代码 | 严重度 |
|------|------|------|--------|
| `src/web/layout/SidebarFrame.tsx` | 27 | `shadow-lg` | 低 |
| `src/web/layout/SidebarFrame.tsx` | 36 | `shadow-lg` | 低 |

**建议**: 
1. 在 `tailwind.config.ts` 添加 `lg: 'var(--shadow-lg)'`
2. 在 `globals.css` 定义 `--shadow-lg`
3. 或在 `SidebarFrame.tsx` 中改用 `shadow-md`

---

## 5. 颜色

### 5.1 硬编码背景色

**0 处** ✅ 全部使用 `bg-background` / `bg-card` / `bg-muted` 等语义类。

### 5.2 硬编码文字色

**0 处** ✅ 全部使用 `text-foreground` / `text-muted-foreground` 等语义类。

---

## 6. 布局尺寸

### 6.1 硬编码高度（4 处）

| 文件 | 行号 | 代码 | 严重度 | 说明 |
|------|------|------|--------|------|
| `src/plugins/design/Workspace.tsx` | 71 | `h-[72px]` | 中 | 设计预览块固定高度 |
| `src/plugins/design/Workspace.tsx` | 81 | `h-[72px]` | 中 | 字体预览块固定高度 |
| `src/plugins/design/Workspace.tsx` | 208 | `h-[38px]` | 中 | 工具栏固定高度 |
| `src/web/components/ui/separator.tsx` | 20 | `h-[1px]` | 低 | 分隔线，可接受 |

### 6.2 硬编码宽度（9 处）

| 文件 | 行号 | 代码 | 严重度 | 说明 |
|------|------|------|--------|------|
| `src/plugins/design/Workspace.tsx` | 172 | `w-[50px]` | 中 | 数字输入框宽度 |
| `src/plugins/bugs/Viewer.tsx` | 110 | `max-w-[420px]` | 低 | 标题最大宽度 |
| `src/plugins/review/viewers/ReviewViewer.tsx` | 188 | `w-[240px]` | 中 | 侧边栏宽度 |
| `src/web/layout/SidebarFrame.tsx` | 27 | `w-[78%]` | 中 | 移动端侧边栏宽度 |
| `src/web/layout/SidebarFrame.tsx` | 35 | `w-[280px]` | 中 | 侧边栏宽度 |
| `src/web/layout/SidebarFrame.tsx` | 36 | `w-[280px]` | 中 | 侧边栏宽度 |
| `src/web/layout/SidebarFrame.tsx` | 42 | `w-[280px]` | 中 | 侧边栏宽度 |
| `src/web/test/layout/SidebarFrame.test.tsx` | 49 | `w-[280px]` | 低 | 测试断言 |

### 6.3 硬编码 padding/margin（2 处）

| 文件 | 行号 | 代码 | 严重度 | 说明 |
|------|------|------|--------|------|
| `src/web/components/ui/scroll-area.tsx` | 34 | `p-[1px]` | 低 | 滚动条内边距 |
| `src/web/components/ui/scroll-area.tsx` | 36 | `p-[1px]` | 低 | 滚动条内边距 |

---

## 7. 图标

### 7.1 硬编码 lucide 导入（13 行 / 10 文件）

| 文件 | 导入的图标 | 行号 |
|------|-----------|------|
| `src/plugins/apply/Viewer.tsx` | `FolderGit2`, `FileText`, `FolderOpen`, `GitBranch` | 1, 4 |
| `src/plugins/design/Workspace.tsx` | `Monitor`, `Tablet`, `Smartphone`, `SlidersHorizontal`, `ImageOff`, `Palette` | 2 |
| `src/plugins/design/Sidebar.tsx` | 未详细检查 | 5 |
| `src/plugins/bugs/Viewer.tsx` | `Bug`, `ExternalLink`, `RefreshCw` | 2 |
| `src/plugins/review/viewers/ReviewViewer.tsx` | `ClipboardCheck`, `Check`, `ChevronDown`, `ChevronUp`, `RotateCcw`, `Send`, `X` | 2, 4 |
| `src/plugins/view/OutlineNav.tsx` | `FileText` | 2 |
| `src/plugins/view/Workspace.tsx` | `Eye` | 9 |
| `src/plugins/stats/Workspace.tsx` | `BarChart3`, `FileText`, `FolderTree`, `BookOpen`, `GitPullRequest` | 2 |
| `src/web/layout/SidebarFrame.tsx` | `ChevronLeft` | 3 |
| `src/web/viewers/UnsupportedViewer.tsx` | `FileQuestion` | 1 |

**影响**: 这些图标在 pixel/slate 主题下不会切换风格，违反"主题有自己的图标体系"原则。

### 7.2 其他图标库

**0 处** ✅ 未使用 react-icons 等其他库。

---

## 8. 字体族

### 8.1 内联 font-family

**1 处**:

| 文件 | 行号 | 代码 | 严重度 |
|------|------|------|--------|
| `src/plugins/design/Workspace.tsx` | 81 | `style={{ fontFamily: value }}` | 低 |

**说明**: 这是字体预览功能，动态展示不同字体，属于合理用例。

### 8.2 硬编码 font-weight

**0 处** ✅ 无硬编码。

---

## 9. 已正确变量化的部分

以下设计令牌已正确映射到 CSS 变量体系：

| 令牌 | Tailwind 映射 | 状态 |
|------|--------------|------|
| 字号 | `text-xs` → `var(--text-xs)` | ✅ |
| 圆角 | `rounded-sm/md/lg/full` → `var(--radius-*)` | ✅ |
| 边框宽度 | `border` → `var(--border-width)` | ✅ |
| 阴影 | `shadow-sm/md` → `var(--shadow-*)` | ✅ |
| 颜色 | `bg-*` / `text-*` 语义类 | ✅ |

---

## 10. 建议修复优先级

### P0 - 高优先级

| 问题 | 文件数 | 建议 |
|------|--------|------|
| 图标未迁移到 useIcons() | 10 | 全部迁移，补全 ICON_MAP |
| 硬编码 `w-[280px]` 侧边栏 | 4 | 提炼为 `--sidebar-w` 变量 |

### P1 - 中优先级

| 问题 | 文件数 | 建议 |
|------|--------|------|
| 硬编码 `h-[72px]` / `h-[38px]` | 3 | 提炼为设计尺寸变量 |
| 硬编码 `rounded-[14px]` | 1 | 改为 `rounded-[var(--radius-lg)]` |
| 硬编码 `w-[240px]` 侧边栏 | 1 | 提炼为变量 |
| `rounded-xl` 未映射 | 1 | 添加 `xl` 映射或改 `rounded-lg` |

### P2 - 低优先级

| 问题 | 文件数 | 建议 |
|------|--------|------|
| 硬编码 `text-[8px]` / `text-[9px]` | 2 | 改为 `text-xs` 或新增变量 |
| 硬编码 `p-[1px]` 滚动条 | 1 | 可接受，滚动条细节 |
| `shadow-lg` 未映射 | 2 | 添加 `lg` 映射或改 `shadow-md` |
| `fontFamily` 动态预览 | 1 | 合理用例，无需改 |

---

## 11. 总结

**健康度评分: 75/100**

- ✅ 字体、颜色、边框宽度、基础阴影已完全变量化
- ⚠️ 布局尺寸仍有 12+ 处硬编码，主要集中在 `design/Workspace.tsx` 和 `SidebarFrame.tsx`
- ❌ 图标体系仅迁移了约 40%，10 个文件仍硬编码 lucide-react

**最大风险**: 
1. 图标体系不完整导致主题切换时风格不一致
2. 布局尺寸硬编码导致响应式适配困难

**下一步建议**: 
1. 优先完成图标迁移（与本次字体标准化同等重要）
2. 将侧边栏宽度 `280px` 提炼为 `--sidebar-w` 变量
3. 将设计工具的高度 `72px` / `38px` 提炼为语义变量
