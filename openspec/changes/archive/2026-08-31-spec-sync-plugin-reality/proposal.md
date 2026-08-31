## Why

主 spec（dashboard-platform）与代码现实严重漂移。apply 插件已在 601171d 有意删除、market 已在 2026-08-28-remove-market-plugin 移除、bugs/review 更早消失，且事件导航（`zd-dashboard-nav`）已被 URL 路由机制取代——但 spec 里仍有 14 处 apply 残留、六插件/参数契约旧口径、禅道配置等整段旧世界。spec 当前对新人是有误导性的假文档。

终态现实：**四个内置插件 stats/view/design/just**，跨插件导航经 URL `navigate`，侧栏为可选槽位。

## What Changes

对 dashboard-platform spec 做 8 处 MODIFIED + 3 处 REMOVED（全部为 spec 文档同步，零业务代码）：

- **MODIFIED**「cordis 插件运行时」：业务插件列表 → stats/view/design/just
- **REMOVE**「插件清单与前端发现」：事件导航已被 URL 路由取代（保留的「内置插件零注册」scenario 折入 SDK 形态 requirement）
- **MODIFIED**「图标导航栏 + 工作区布局」：侧栏改为可选槽位（just 无侧栏）
- **REMOVE**「worktree 感知」：apply 进度部分随插件消亡；view 树排除 `.zworktree/` 折入 worktree 平台级
- **MODIFIED**「worktree 平台级」：去 apply 跳转语义，改为 view 内 Worktrees 分组展开
- **REMOVE**「统计卡片下钻」：已被「stats 跨插件钻取」（URL navigate 版）取代
- **MODIFIED**「依赖激活与交互反馈」：去禅道配置条款（bugs 已移除）
- **MODIFIED**「zskills 数据目录约定（.zdev）」：重写为现行约定（.zdev/design、.zdev/apply/runs + watch 覆盖 .zdev）
- **MODIFIED**「六内置插件统一 SDK 形态」→「内置插件统一 SDK 形态」：四插件，去 apply-batch guardedRoute/SSE 条款，接入「零注册」scenario
- **MODIFIED**「插件内状态全部承载于 URL」：params 契约收敛到四插件
- **MODIFIED**「插件序列完成冒烟关口」：六插件计数改为当前内置插件集合

## 成功标准

1. `openspec validate` 通过（11 个 delta 全部解析，requirement 标题与主 spec 逐字匹配）
2. 归档后主 spec：`grep -i "apply\|apply-batch\|bugs\|review\|market\|禅道\|zd-dashboard-nav"` 仅剩 cordis `apply(ctx)` API 语义与历史既定内容，无插件级残留
3. spec 与代码现实一一对应（四插件、URL 导航、可选侧栏、.zdev 现行约定）

## 依赖

无前置（纯 spec 文档同步）。

## 优先级

- P1：spec 是架构真相源，当前处于误导状态；且全部文档改动，成本极低。
