## MODIFIED Requirements

### Requirement: just 多任务并发视图

just 插件不设侧边栏:主区 LogViewer 内嵌任务列表为唯一任务选择面,并发运行多个 recipe 时在该列表展示运行态并点击切换主区日志;各任务日志 SHALL 按 taskId 隔离互不串扰。server 侧 SHALL 支持多任务并发执行(若现有 JustRunner 为单实例则改造为 runner 池)。

#### Scenario: 并发双任务日志隔离

- **WHEN** 同时启动两个 recipe
- **THEN** LogViewer 内嵌任务列表出现两个活跃条目,分别点开显示各自日志,内容无交叉

#### Scenario: 无侧边栏布局

- **WHEN** 用户从 IconRail 进入 just 插件
- **THEN** 页面仅渲染主区(LogViewer 全宽),SidebarFrame 按 `plugin?.Sidebar` 判空收栏,任务选择经内嵌列表完成并写回 `recipe`/`task` URL 参数
