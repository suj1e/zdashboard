# Design: worktree 平台化 + stats 下钻 + view 大纲

基于 main（2.1.1）。现状：`gitWorktrees` 在 `src/plugins/apply/index.ts`（只被 apply 用，返回 `{path,name,branch,head}` 无 dirty）；`/__worktrees` 端点同文件；view Sidebar 的 spec-scan skip 集合排除 `.zworktree`；stats Workspace 卡片是纯 `<div>`；view Workspace 用 viewerFor 分发。

## A. worktree 平台级

### A1. `src/core/worktrees.ts`（新独立模块）

```ts
export interface WorktreeInfo { path: string; name: string; branch: string; head: string; dirty: boolean; }
export function listWorktrees(root: string): Promise<WorktreeInfo[]>
```

- `listWorktrees` = 现在的 `gitWorktrees`（`git worktree list --porcelain`，cwd=root，timeout 常量）+ **dirty 探测**：对每条 `git -C <path> status --porcelain` 经 `execFile` 非空即 `dirty:true`（失败默认 false）
- 只回 `.zworktree/` 下的（现状已如此）；`name` = 路径分段取最后一个
- GIT_TIMEOUT_MS 常量从 apply 移到此处

### A2. `/__worktrees` 移到 core

- 从 `src/plugins/apply/index.ts` 删除该 route；改在 `src/core/` 新插件（或并入现有 core 插件）暴露——选 `src/core/worktrees.ts` 同时导出 cordis 插件 `apply(ctx)`（inject ['server']）注册 `GET /__worktrees`
- apply 的 WorktreeOverview 继续 fetch `/__worktrees`（路径不变，属主变了）

### A3. view 树 worktrees 分组入口（view Sidebar）

- view Sidebar 顶部（过滤框下方）加「Worktrees (n)」分组：
  - fetch `/__worktrees`，仅在 `list.length > 0` 时渲染分组
  - 每项：分支名 + 目录名 + dirty 红点；点击整行 → 触发 `zd-dashboard-nav`（detail `{mode:'apply', wt: name}`）+ 高亮
- 数据经 useEffect fetch（无 refreshKey 也没关系，页面 reload 时刷新；可选挂 SSE files）

### A4. 平台内跳转（App + ApplyViewer）

- App.tsx：`useEffect` 监听 `window 'zd-dashboard-nav'`，`setMode(state.detail.mode)`；把 `wt` 透传给当前插件容器——实现：App 维护 `navTarget` state，作为 prop 传给 `plugin.Workspace`
- ApplyViewer：接收 `navTarget?: {wt:string}`；`useEffect` 读它 → `select(navTarget.wt)`（选中该 change + 展开 tasks）；处理完清除
- hash 不参与（保持 `#apply` 纯 mode），导航走事件——简单明确

## B. stats 可点击下钻

- stats Workspace 卡片从 div 改 button/可点击（含 hover 提示"点击跳转"）
- 点击行为：`window.dispatchEvent(new CustomEvent('zd-dashboard-nav', {detail:{mode:'view', filter:'.md'}}))`（文件类）或 `{mode:'apply'}`（变更类）
- App 监听 `zd-dashboard-nav`：view 模式时把 `filter` 作为 navTarget 透传给 view Sidebar（预填过滤框）；apply 模式走 A4
- 为通用，navTarget 统一为 `{ mode, filter?, wt? }`

## C. view 长文档大纲侧浮

- 新组件 `src/plugins/view/OutlineNav.tsx`：入参 `{ path, containerRef }`，渲染后 `containerRef.current.querySelectorAll('h1,h2,h3')` 提取 `id`（rehype-slug 已生成锚点）→ 侧栏列表；点击 `document.getElementById(id)?.scrollIntoView({behavior:'smooth'})`
- view Workspace：预览时若内容 > 2500 字（MdViewer 传回文本长度或读 DOM 文本量——读 DOM 简单），渲染右侧 OutlineNav；短文档/窄屏不渲染
- 不侵入 MdViewer：OutlineNav 是 view 层增强，读 DOM 锚点而非改 MdViewer

## 明确不做

- worktree 新实例打开（平台内跳转已覆盖）
- worktree 的 git 写操作（dirty 只读探测）
- 大纲持久化折叠状态

## 验证

1. `pnpm build` + vitest 全绿
2. 造 `.zworktree/<change>/`（改动某文件成 dirty）→ `/__worktrees` 返回 `dirty:true`；clean worktree → `dirty:false`；`/__worktrees` 路径仍可用（apply WorktreeOverview 不受影响）
3. view 树出现「Worktrees (n)」分组，每项带分支/dirty；点击 → 切到 apply 并选中对应 change、展开其 tasks
4. stats：点「Markdown 9」→ 切 view 且过滤框预填 `.md`；点「变更 1/2」→ 切 apply
5. view 打开长文档（如架构说明.md）→ 右侧大纲可见且点击平滑滚动；短文档无大纲
