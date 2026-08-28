## Why

apply 插件（单 change + 批量驾驶舱两 Tab）当前内容区是迁移自旧插件的「上下长条堆叠」：单 change 的列表与详情纵向排列，长 proposal 一展开就把列表顶出视口；批量页 graph/checkpoint/plan/logs 从上到下平铺，日志一多关键信息被推走。三个 Tab 的顶部信息层（面包屑/状态/操作区）风格也各自为政。页面结构需要一次系统重排。

## What Changes

- **单 change 分栏**：左列 change 列表（摘要卡片：名称/进度/标记），右列选中 change 的详情（进度条/任务列表/proposal/design 渲染），`grid-cols-[280px_1fr]` 分栏；URL `change` 参数驱动选中（现有契约不变）
- **批量页分区**：顶部 run 概览条（runId/状态/批次进度/并发度一行呈现）→ 中部主区（依赖图｜checkpoint 子视图切换，维持组件 state 切换语义）→ 底部日志区（固定高度独立滚动，不再无限增高推走上方内容）
- **顶部信息层统一**：两 Tab 共用同一 PluginPage 面包屑/状态条形态，操作区（刷新等）位置一致

## 成功标准

1. 单 change：列表与详情同屏分栏；选中切换仅右列刷新；小屏（<md）退化为上下堆叠
2. 批量：概览条固定首屏可见；日志区独立滚动不推挤 graph；空态引导保留
3. 两 Tab 顶部结构一致（同一边距/层级）；`?p=apply&view=batch` 深链与 `?p=apply-batch` 重定向行为不变
4. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/archive/2026-08-28-apply-merge-progress/（Tab 壳与两视图基座）
- 前置:openspec/changes/archive/2026-08-28-align-zskills-contracts/（🔧[人工] 口径与徽标，重排中保留）

## 优先级

- P1：用户点名的体验重构，apply 是高频主页面。
