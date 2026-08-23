## 1. 图标体系：迁移到 useIcons()

- [x] 1.1 在 `ICON_MAP` 中补充缺失图标映射：
  - `FolderGit2`, `Tablet`, `Smartphone`, `SlidersHorizontal`, `ImageOff`
  - `Bug`, `ExternalLink`, `RefreshCw`
  - `ClipboardCheck`, `ChevronDown`, `ChevronUp`, `RotateCcw`, `Send`, `X`
  - `BarChart3`, `FolderTree`, `GitPullRequest`
  - `ChevronLeft`, `FileQuestion`
- [x] 1.2 `src/plugins/apply/Viewer.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.3 `src/plugins/design/Workspace.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.4 `src/plugins/design/Sidebar.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.5 `src/plugins/bugs/Viewer.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.6 `src/plugins/review/viewers/ReviewViewer.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.7 `src/plugins/view/OutlineNav.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.8 `src/plugins/view/Workspace.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.9 `src/plugins/stats/Workspace.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.10 `src/web/layout/SidebarFrame.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`
- [x] 1.11 `src/web/viewers/UnsupportedViewer.tsx`：移除 `lucide-react` 导入，改用 `useIcons()`

## 2. 圆角：修复硬编码 + 补映射

- [x] 2.1 `src/plugins/apply/Viewer.tsx:189`：`rounded-[14px]` → `rounded-[var(--radius-lg)]`
- [x] 2.2 `tailwind.config.ts`：添加 `xl: 'var(--radius-xl)'` 映射
- [x] 2.3 `globals.css`：添加 `--radius-xl: 18px` 默认值（或根据设计稿调整）
- [x] 2.4 各主题 CSS 按需覆盖 `--radius-xl`

## 3. 阴影：补 shadow-lg 映射

- [x] 3.1 `tailwind.config.ts`：添加 `lg: 'var(--shadow-lg)'` 映射
- [x] 3.2 `globals.css`：添加 `--shadow-lg` 默认值
- [x] 3.3 `src/web/layout/SidebarFrame.tsx`：确认 `shadow-lg` 走变量映射

## 4. 布局尺寸：变量化

- [x] 4.1 `globals.css`：添加 `--sidebar-w: 280px` 默认值
- [x] 4.2 `src/web/layout/SidebarFrame.tsx`：`w-[280px]` → `w-[var(--sidebar-w)]`
- [x] 4.3 `src/web/layout/SidebarFrame.tsx`：`w-[78%]` → `w-[calc(var(--sidebar-w)*0.78)]` 或保留百分比
- [x] 4.4 `src/plugins/design/Workspace.tsx`：`h-[72px]` → `h-[var(--design-preview-h)]`
- [x] 4.5 `globals.css`：添加 `--design-preview-h: 72px`
- [x] 4.6 `src/plugins/design/Workspace.tsx`：`h-[38px]` → `h-[var(--design-toolbar-h)]`
- [x] 4.7 `globals.css`：添加 `--design-toolbar-h: 38px`
- [x] 4.8 `src/plugins/design/Workspace.tsx`：`w-[50px]` → `w-[var(--design-input-w)]`
- [x] 4.9 `globals.css`：添加 `--design-input-w: 50px`
- [x] 4.10 `src/plugins/review/viewers/ReviewViewer.tsx`：`w-[240px]` → `w-[var(--review-sidebar-w)]`
- [x] 4.11 `globals.css`：添加 `--review-sidebar-w: 240px`

## 5. 极小字号：修复硬编码

- [x] 5.1 `src/plugins/apply/Viewer.tsx:68`：`text-[8px]` → `text-xs`
- [x] 5.2 `src/plugins/review/viewers/ReviewViewer.tsx:224`：`text-[9px]` → `text-xs`
- [x] 5.3 或新增 `--text-8`/`--text-9` 变量（如视觉要求保留极小字号）

## 6. 间距：修复滚动条硬编码

- [x] 6.1 `src/web/components/ui/scroll-area.tsx`：`p-[1px]` → `p-px` 或标准类

## 7. 构建验证

- [x] 7.1 执行 `pnpm build`，确认无构建错误
- [x] 7.2 启动服务，视觉确认 default/pixel/slate 三主题
- [x] 7.3 确认 `grep -rn "from 'lucide-react'" src/plugins/ src/web/` 仅剩 `icons.tsx`
- [x] 7.4 确认 `grep -rn "rounded-\[14px\]\|rounded-xl\|shadow-lg" src/` 无结果（应走变量）
- [x] 7.5 确认 `grep -rn "text-\[8px\]\|text-\[9px\]" src/` 无结果
