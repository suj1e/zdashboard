# Tasks: Shell 双槽结构 + stats 内置 + UI 修正

## Phase 1: Shell 结构

- [x] 1.1 `src/web/lib/plugins.ts`：WebPlugin 加 `Sidebar?` 槽；ORDER 首位插 `'stats'`
- [x] 1.2 `src/web/layout/SidebarFrame.tsx`：折叠 chevron + localStorage 按 mode 记忆（`zd-sidebar-<mode>`）+ 折叠态边缘热区 hover 临时展开（overlay 滑出、移开收回、不改状态）+ 移动端 fixed/遮罩
- [x] 1.3 `src/web/App.tsx`：Content 槽结构化（`flex-1 p-6` + dotBg 点点背景，结构性强制）；渲染 `plugin.Sidebar` 于 SidebarFrame 内、`plugin.Workspace` 于 Content 槽（Suspense 包裹）

## Phase 2: 插件迁移

- [x] 2.1 view：FileTree 迁入 `Sidebar.tsx`（去掉自带 fixed/translate/open 逻辑）；Workspace 只留内容卡（max-w-5xl）
- [x] 2.2 design：资产树抽出为 `Sidebar.tsx`；Workspace 留视口工具栏 + 预览卡；去掉自带 dotBg/p-6
- [x] 2.3 bugs：Workspace 内容卡改 max-w-6xl，去掉外层自带容器样式
- [x] 2.4 apply：同 2.3（max-w-6xl）
- [x] 2.5 just：LogViewer 改卡片式（去 h-full 全出血），Workspace 卡片 max-w-6xl
- [x] 2.6 review：Workspace 去掉自带容器样式（Shell 接管）

## Phase 3: stats 内置 + design 修正 + examples 更换

- [x] 3.1 `src/plugins/stats/`：index.ts（`/__stats/data` + manifest，scan 逻辑自 examples 迁入）+ web.tsx + Workspace.tsx（React 化：卡片网格 + Top10 条形 + 徽标行，max-w-6xl）；cli.ts 挂载
- [x] 3.2 `src/server/design-assets.ts`：categorize 删除 code 归类（CODE_EXTS 非token直接跳过）；design 前端 GROUPS 同步移除 code
- [x] 3.3 examples：删 `examples/stats/`；新增 `examples/notes/`（GET/POST + web 便签页）；README 示例章节更新

## Phase 4: 验证

- [x] 4.1 vitest 全绿（含 SidebarFrame 记忆的新测试）；pnpm build 全绿
- [x] 4.2 冒烟 + 浏览器走查：stats 侧边栏第一位、逐工作区容器一致（点点背景+居中卡）、view/design 折叠与跨 mode 记忆、hover 临时展开、design 无代码分组、notes 示例 POST 读写 + 热刷新
