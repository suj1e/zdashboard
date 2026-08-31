# 设计:spec 与现实对齐

## 现有系统分析

代码终态（main@bb3d27f）：四内置插件 stats/view/design/just（definePlugin/defineWebPlugin + manifest 单源）、跨插件导航经 URL `navigate`、侧栏可选（just 无）、`.zdev/` 约定目录（design 资产、apply 批量 runs）、配置中心基建保留、外部插件机制保留。

spec 漂移清单（14 处 apply mention 之外）：

| spec 位置 | 漂移 | 处置 |
|---|---|---|
| cordis 插件运行时 | 插件列表含 bugs/review/apply | MODIFIED:列表收敛四插件 |
| 插件清单与前端发现 | `zd-dashboard-nav` 事件导航——已被 284 行 URL 路由 requirement 明文废除 | REMOVE(「内置插件零注册」scenario 折入 SDK 形态) |
| 图标导航栏 + 工作区布局 | 「每个插件自带侧栏」——just 已无侧栏,侧栏为可选槽位 | MODIFIED |
| worktree 感知 | 「apply 进度/worktree 执行中 badge」随插件消亡;view 树排除 .zworktree 仍真 | REMOVE(view 树排除折入 worktree 平台级) |
| worktree 平台级 | 「切换至 apply 视图聚焦 change」失效 | MODIFIED:分组展开语义 |
| 统计卡片下钻 | 「变更类卡片→apply」失效;与 338「stats 跨插件钻取」重复 | REMOVE(被 URL navigate 版取代) |
| 依赖激活与交互反馈 | 禅道配置 yaml 条款随 bugs 移除 | MODIFIED:去禅道条款 |
| zskills 数据目录约定 | bugs/review 数据约定失效;现行约定为 .zdev/design + .zdev/apply/runs | MODIFIED:重写现行约定 |
| 六内置插件统一 SDK 形态 | 六→四;apply-batch guardedRoute/SSE 条款失效 | MODIFIED(更名「内置插件统一 SDK 形态」+零注册 scenario) |
| 插件内状态全部承载于 URL | params 契约含 apply/apply-batch | MODIFIED:四插件 params |
| 插件序列完成冒烟关口 | 「六个内置插件页面」计数过期 | MODIFIED:当前内置插件集合 |

## 方案设计

纯 spec delta 文档（本 change 目录 `specs/dashboard-platform/spec.md`），零业务代码。所有 MODIFIED 的 requirement 标题与主 spec 逐字一致；REMOVE 附全文。改写后的措辞以当前实现为唯一真相源（四插件、URL 导航、可选侧栏、.zdev 现行约定），不发明未实现的行为。

**不做**：不动业务代码；不为已消亡功能补「删除记录」类新 requirement；不改 spec 之外的 README（其插件清单经 grep 确认无 apply/market 残留）。

## 接口 / 数据契约

无代码契约变更。

## 实施步骤

1. 落盘 11 处 delta（8 MODIFIED + 3 REMOVED）
2. `openspec validate` 全通过
3. 归档合并后 grep 核验零插件级残留

## 风险与 Trade-off

- 风险：MODIFIED 文本与主 spec 标题不一致导致 delta 解析失败 → validate 门禁拦截，逐字复制标题
- 开放问题：「冒烟关口」为历史里程碑 requirement,保留原文仅改插件计数;若未来想清理历史关口类条目另立 change

## 测试策略

- **结构**：`openspec validate` 通过；`openspec show --deltas-only` deltaCount=11
- **归档核验**：归档后主 spec grep 无插件级 apply/bugs/review/market/禅道残留（cordis `apply(ctx)` API 语义除外）
