## ADDED Requirements

### Requirement: 六内置插件统一 SDK 形态

stats/view/apply/design/just/apply-batch 六个内置插件 SHALL 全部以 `definePlugin`(server)与 `defineWebPlugin`(client)声明,manifest 单源;foundation 提供的旧 web.tsx 兼容分支 SHALL 删除。apply-batch 的全部写路由 SHALL 经 guardedRoute 强制 stop-token;其前端 SHALL 通过 `plugin:apply-batch:state` SSE 获得状态更新,不再使用定时轮询,且不得 import server 侧 store 的运行时代码(仅 import type)。

#### Scenario: apply-batch 鉴权与实时性

- **WHEN** 未携带 stop-token POST `/__apply-batch/approve`,以及批量 store 发生一次状态变更
- **THEN** 前者返回 403;后者 UI 在 1 秒内更新且 Network 中无周期性轮询请求

### Requirement: 插件内状态全部承载于 URL

六插件的页面内状态 SHALL 按 manifests 的 ParamSchema 契约承载于 searchParams:view 为 `wt/file/filter`,apply 为 `change`,apply-batch 为 `view/sel`,just 为 `recipe/task`,design 为 `type/asset/folder`,stats 钻取来源为 `card`。刷新与分享深链接 SHALL 完整恢复页面状态。

#### Scenario: view 状态恢复

- **WHEN** 在 view 中展开某 worktree 并打开一个文件后复制 URL,在新标签页打开
- **THEN** 同一 worktree 分组与文件被还原选中并渲染预览

### Requirement: stats 跨插件钻取

stats 卡片 SHALL 做实钻取:点击 Worktree 卡片 SHALL 导航至 view(`?p=view`);点击未提交卡片 SHALL 导航至 view 并携带 dirty 高亮上下文。钻取 SHALL 经 URL navigate 实现,不使用自定义事件。

#### Scenario: Worktree 卡片跳转

- **WHEN** 点击 stats 页的 Worktree 卡片
- **THEN** URL 变为 `?p=view`(可带 card=worktree 标记)且 view 插件打开

### Requirement: just 多任务并发视图

just 插件 SHALL 提供活跃任务侧栏:并发运行多个 recipe 时,侧栏列出全部活跃任务,点击切换主区日志;各任务日志 SHALL 按 taskId 隔离互不串扰。server 侧 SHALL 支持多任务并发执行(若现有 JustRunner 为单实例则改造为 runner 池)。

#### Scenario: 并发双任务日志隔离

- **WHEN** 同时启动两个 recipe
- **THEN** 侧栏出现两个活跃条目,分别点开显示各自日志,内容无交叉
