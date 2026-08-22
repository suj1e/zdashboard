## Why

worktree 是 zapply 新执行模型的重要场景：每个 change 在 `.zworktree/<change>/` 独立 worktree 执行。当前 worktree 能力只在 apply 插件内部（进度读取 + `/__worktrees`），view 文件树直接排除 `.zworktree/` 纯属隐藏——工作区真实状态在 dashboard 上看不到，用户无法从项目浏览跳转理解"这个 change 正在哪个 worktree 跑"。需要把 worktree 升级为平台级一等公民，配合 stats 下钻与 view 文档大纲，补全信息可感知性。

## What Changes

### worktree 平台级

- 抽 `src/core/worktrees.ts` 独立模块：`listWorktrees(root)` 返回 `{ path, name, branch, head, dirty }[]`（dirty 经 `git status --porcelain` 探测），`/__worktrees` 端点从 apply 移到 core 平台层，供多插件共用
- **view 树 worktrees 分组入口**：view Sidebar 顶部加「Worktrees (n)」分组，列出全部 `.zworktree/*`（含名字/分支/脏标识）；空白列表不显示分组
- **平台内跳转**：view 树点击某 worktree 行「查看进度」→ 切到 apply 视图并聚焦该 worktree 对应 change（选中 + 展开其 tasks）；实现经 App 层全局导航事件 `zd-dashboard-nav`（detail: `{ mode:'apply', wt:'<change>' }`），App 监听转发 ApplyViewer

### stats 可点击下钻

- stats 统计卡片包成可点击：点「文件/目录/Markdown」→ 跳 view 并聚焦对应 filter；点「变更 进行/归档」→ 跳 apply 并聚焦列表；复用导航事件

### view 长文档大纲侧浮导航

- 仅文件预览时，对 >2500 字的长文档在右侧渲染大纲（解析 h1/h2/h3 → 固定窄栏，点击平滑滚动锚点）；不侵入 MdViewer 本体
- 短文档不显示大纲（避免噪音）；窄屏隐藏

## Capabilities

### New Capabilities

- `worktree-platform`：worktree 平台级（列表模块、dirty 探测、view 树分组入口、平台内跳转、`/__worktrees` 属 core）
- `stats-drilldown`：stats 卡片可点击下钻到相关视图

### Modified Capabilities

- `dashboard-platform`：新增平台内导航事件契约（`zd-dashboard-nav`）；view 工作区支持长文档大纲导航
