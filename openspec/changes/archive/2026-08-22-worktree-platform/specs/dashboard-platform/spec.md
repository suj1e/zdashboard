## ADDED Requirements

### Requirement: worktree 平台级

系统 SHALL 提供平台级 worktree 列表能力：`/__worktrees` 返回全部 `.zworktree/*` worktree（名称/分支/HEAD/脏状态，脏经 `git status --porcelain` 探测）；worktree 数据 SHALL 由 core 层提供（非单个插件私有）。view 工作区文件树 SHALL 提供 Worktrees 分组入口，点击某项 SHALL 经平台内导航事件切换至 apply 视图并聚焦对应 change。dashboard SHALL 只读探测 worktree 状态，不执行 git 写操作。

#### Scenario: worktree 列表含脏状态

- **WHEN** `.zworktree/<name>/` 存在且该目录有未提交改动
- **THEN** `/__worktrees` 返回 `dirty:true`；clean 目录返回 `dirty:false`

#### Scenario: view 树分组与跳转

- **WHEN** 项目存在 `.zworktree/<name>/`，view 树显示 Worktrees 分组（含分支与脏标识）
- **THEN** 点击某 worktree 项，视图切换至 apply 并自动选中/展开对应 change 的 tasks

#### Scenario: 空列表不显示

- **WHEN** 项目无任何 `.zworktree/*`
- **THEN** view 树不显示 Worktrees 分组

### Requirement: 统计卡片下钻

stats 工作区的统计卡片 SHALL 可点击：点击文件/目录/Markdown 类卡片 SHALL 导航至 view 工作区并预设相应过滤，点击变更类卡片 SHALL 导航至 apply 工作区。导航经平台内导航事件完成。

#### Scenario: 统计跳转

- **WHEN** 点击「Markdown 9」卡片
- **THEN** 切至 view 工作区且文件过滤框预填 `.md`；点击「变更 1/2」切至 apply

## MODIFIED Requirements

### Requirement: 插件清单与前端发现

前端 SHALL 支持插件间跨导航：`zd-dashboard-nav` 事件（detail `{ mode, filter?, wt? }`）由 Shell 监听并切换目标工作区，向目标插件透传焦点目标（过滤器/change）。内置与外部插件均可派发该事件实现下钻。

#### Scenario: 跨插件聚焦导航

- **WHEN** 任一工作区派发 `zd-dashboard-nav { mode:'apply', wt:'x' }`
- **THEN** Shell 切换至 apply 工作区并聚焦 change x

#### Scenario: 内置插件零注册

- **WHEN** 开发者在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）
- **THEN** 无需修改 App.tsx 或任何 core 代码，重启后新插件出现在 IconRail 与首页卡片，内容自动获得统一容器
