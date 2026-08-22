# Tasks: worktree 平台化 + stats 下钻 + view 大纲

## worktree 平台级

- [ ] 1.1 `src/core/worktrees.ts`：WorktreeInfo（+dirty）+ listWorktrees(root)（git worktree list --porcelain + git status --porcelain 探 dirty）+ cordis 插件 apply 注册 GET /__worktrees；GIT_TIMEOUT_MS 移入
- [ ] 1.2 `src/plugins/apply/index.ts`：删除 /__worktrees route 与 gitWorktrees（改 import core listWorktrees 或删除残留）；WorktreeOverview fetch 路径不变
- [ ] 1.3 `src/plugins/view/Sidebar.tsx`：Worktrees 分组入口（fetch /__worktrees，n>0 才显示；行=分支名+目录名+dirty 红点；点击 dispatch zd-dashboard-nav {mode:'apply',wt:name}）
- [ ] 1.4 `src/web/App.tsx`：监听 zd-dashboard-nav，setMode + navTarget 透传
- [ ] 1.5 `src/plugins/apply/Viewer.tsx`：接收 navTarget，聚焦对应 change（select + 展开）

## stats 下钻 + view 大纲

- [ ] 2.1 `src/plugins/stats/Workspace.tsx`：卡片可点击，dispatch zd-dashboard-nav（文件类{mode:'view',filter}，变更类{mode:'apply'}）
- [ ] 2.2 `src/plugins/view/Sidebar.tsx`：接收 filter 预设（从 navTarget）预填过滤框
- [ ] 2.3 `src/plugins/view/OutlineNav.tsx`：新组件，读 DOM 锚点 h1/h2/h3，点击平滑滚动
- [ ] 2.4 `src/plugins/view/Workspace.tsx`：长文档（>2500 字）时渲染 OutlineNav（右侧，窄屏隐藏）

## 验证

- [ ] 3.1 pnpm build + vitest 全绿
- [ ] 3.2 冒烟：.zworktree dirty/clean 探测、view 分组入口+跳转 apply 聚焦、stats 下钻、大纲滚动（对应 design 验证节）
