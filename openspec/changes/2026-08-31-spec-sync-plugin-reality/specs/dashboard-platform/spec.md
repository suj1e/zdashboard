## MODIFIED Requirements

### Requirement: cordis 插件运行时

系统 SHALL 以 cordis@4.0.0-rc.8 作为插件运行时：core 服务（server/reload/tree/manifest）与业务插件（stats/view/design/just）全部为 cordis 插件，通过 `ctx.server.route()` / `ctx.server.sse()` 注册能力，注册自动 effect 化，插件卸载时逆序回收副作用。

#### Scenario: 插件注册即回收

- **WHEN** 插件在 `apply(ctx)` 中调用 `ctx.server.route(path, handler)`
- **THEN** 路由立即可达，且插件 dispose 后该路由返回 404，无需插件手写注销

#### Scenario: 停止触发统一清理

- **WHEN** 客户端携带正确 stopToken `POST /__stop`
- **THEN** 系统逆序执行全部插件清理（含 just 子进程 kill、fs.watch 关闭、SSE 断开）后退出进程，无残留子进程

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治，侧栏为可选槽位（无侧栏需求的插件如 just 直接全宽主区）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。Topbar 右侧 SHALL 提供明暗切换与独立的风格选择器（多风格下拉）。

#### Scenario: hash 直达

- **WHEN** 打开 `http://localhost:4190/#design`
- **THEN** 直接进入 design 插件工作区；切换插件时 hash 同步更新

### Requirement: worktree 平台级

系统 SHALL 提供平台级 worktree 列表能力：`/__worktrees` 返回全部 `.zworktree/*` worktree（名称/分支/HEAD/脏状态，脏经 `git status --porcelain` 探测）；worktree 数据 SHALL 由 core 层提供（非单个插件私有）。view 工作区文件树 SHALL 将各 worktree 以独立分组呈现（含分支与脏标识），分组内展开该 worktree 约定目录（openspec/docs）的文件树；view 文件树 SHALL 排除 `.zworktree/` 目录本身。dashboard SHALL 只读探测 worktree 状态，不执行 git 写操作。

#### Scenario: worktree 列表含脏状态

- **WHEN** `.zworktree/<name>/` 存在且该目录有未提交改动
- **THEN** `/__worktrees` 返回 `dirty:true`；clean 目录返回 `dirty:false`

#### Scenario: view 树分组展开

- **WHEN** 项目存在 `.zworktree/<name>/`，view 树显示该 worktree 分组（含分支与脏标识）
- **THEN** 展开分组后仅呈现该 worktree 约定目录下的文件；项目无任何 `.zworktree/*` 时不显示 worktree 分组

### Requirement: 依赖激活与交互反馈

系统 SHALL 使用已声明依赖替代手搓实现：文件大小/时长格式化使用 filesize/date-fns；树过滤输入经 use-debounce 防抖（≥150ms）。关键操作失败（停止服务、just 启停）SHALL 以 toast 通知用户，不只写控制台。

#### Scenario: 错误以 toast 呈现

- **WHEN** just 启停请求失败
- **THEN** 页面右下角出现 toast 错误提示

### Requirement: zskills 数据目录约定（.zdev）

系统 SHALL 按约定从 `<root>/.zdev/` 读取 skill 产出数据：design 插件扫描 `.zdev/design/`（zdesign/zasset 产出根），apply 插件批量只读视图经 `.zdev/apply/CURRENT` 指针读取 `.zdev/apply/runs/<runId>/state.json`（zapply batch 约定）。文件变更监听 SHALL 覆盖 `.zdev/` 子目录，数据写入后相关插件视图经 SSE 静默刷新。

#### Scenario: 批量状态写入后面板静默刷新

- **WHEN** zapply batch 运行中更新 `.zdev/apply/runs/<runId>/state.json`
- **THEN** apply 批量驾驶舱经 SSE `files` 事件自动重取并呈现最新批次状态，无整页刷新

### Requirement: 内置插件统一 SDK 形态

stats/view/design/just 四个内置插件 SHALL 全部以 `definePlugin`(server)与 `defineWebPlugin`(client)声明，manifest 为 server/client 共享单源。内置插件零注册：在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）并接入注册表后，无需修改 App.tsx 或任何 core 代码，新插件即出现在 IconRail 与首页卡片。

#### Scenario: 四插件注册表自洽

- **WHEN** 启动 zdashboard 并请求 `/__plugins`
- **THEN** 返回 stats/view/design/just 四个 manifest，无已移除插件（apply/apply-batch/market/bugs/review）残留

### Requirement: 插件内状态全部承载于 URL

四个内置插件的页面内状态 SHALL 按 manifests 的 ParamSchema 契约承载于 searchParams:view 为 `wt/file/filter`，just 为 `recipe/task`，design 为 `type/asset/folder`，stats 钻取来源为 `card`。刷新与分享深链接 SHALL 完整恢复页面状态。

#### Scenario: view 状态恢复

- **WHEN** 在 view 中展开某 worktree 并打开一个文件后复制 URL，在新标签页打开
- **THEN** 同一 worktree 分组与文件被还原选中并渲染预览

### Requirement: 插件序列完成冒烟关口

plugin-platform change 序列 SHALL 以端到端冒烟作为完成关口:全部内置插件页面、首页、外部 demo 插件、三套主题×明暗、深链接刷新/后退全部走查,console 零 error;已移除插件的残留(detect 旧链、vite 代理、死 CSS 变量、孤儿类型、启动日志字段)SHALL 清零。

#### Scenario: 残留清零核验

- **WHEN** 在 src/ 与 vite.config.ts 中 grep 已移除插件的标识符与代理路径
- **THEN** 全部无命中

## REMOVED Requirements

### Requirement: 插件清单与前端发现

前端 SHALL 支持插件间跨导航：`zd-dashboard-nav` 事件（detail `{ mode, filter?, wt? }`）由 Shell 监听并切换目标工作区，向目标插件透传焦点目标（过滤器/change）。内置与外部插件均可派发该事件实现下钻。

#### Scenario: 跨插件聚焦导航

- **WHEN** 任一工作区派发 `zd-dashboard-nav { mode:'apply', wt:'x' }`
- **THEN** Shell 切换至 apply 工作区并聚焦 change x

### Requirement: worktree 感知

apply 进度 SHALL 优先读取 `.zworktree/<change>/openspec/changes/<change>/` 下的 tasks/proposal/design（主目录兜底），卡片标注「worktree 执行中」；`GET /__worktrees` SHALL 返回 `.zworktree/` 下的 worktree 清单（名称/分支）；view 文件树 SHALL 排除 `.zworktree/`。dashboard SHALL NOT 执行任何写 git 操作。

#### Scenario: worktree 进度优先

- **WHEN** 主目录 tasks.md 为空、worktree 内已勾 2/5
- **THEN** apply 卡片显示 2/5 与执行中 badge，不显示 0/5

#### Scenario: 文件树无副本噪音

- **WHEN** 项目存在 `.zworktree/<name>/`（整套代码副本）
- **THEN** view 工作区文件树不显示该目录

### Requirement: 统计卡片下钻

stats 工作区的统计卡片 SHALL 可点击：点击文件/目录/Markdown 类卡片 SHALL 导航至 view 工作区并预设相应过滤，点击变更类卡片 SHALL 导航至 apply 工作区。导航经平台内导航事件完成。

#### Scenario: 统计跳转

- **WHEN** 点击「Markdown 9」卡片
- **THEN** 切至 view 工作区且文件过滤框预填 `.md`；点击「变更 1/2」切至 apply
