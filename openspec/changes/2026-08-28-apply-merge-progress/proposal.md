# 2026-08-28-apply-merge-progress

apply+apply-batch 合并为执行进度插件,批量数据源迁移 .zdev/apply 只读

## 需求复述

「执行进度」页当前裂成两个插件：apply（单 change 进度，order 40）与 apply-batch（批量驾驶舱，order 60），图标分居 IconRail 两处，用户要在两页间跳。二者本质是同域数据（zapply 执行产物）的两种视图，完全可以合为一个插件、顶部 Tab 切换。

同时批量数据源需要对齐新版 zapply 约定：状态文件从旧路径 `.zapply/batch-state.json` 迁到 `.zdev/apply/runs/<runId>/state.json`（`.zdev/apply/CURRENT` 指针指向活动 run）。该文件由 zapply skill 写入，dashboard 若保留写操作（approve/pause/retry 等 7 条写路由）会与 skill 形成双写冲突——故合并后的批量视图为**只读**。

## 要解决的问题

1. 同域两插件分裂：图标重复、上下文割裂、home 卡片重复
2. 数据源错位：store 读 `.zapply/batch-state.json`，而新版 zapply 写 `.zdev/apply/runs/<runId>/state.json` + `CURRENT`，现批量页读不到新数据
3. 双写风险：dashboard 写 state.json 会覆盖/被覆盖 skill 的运行态

## 成功标准

1. IconRail/home 仅一个「执行进度」插件（mode `apply`）；`apply-batch` mode 从注册表消失，旧 URL `?p=apply-batch` 回落首页（App 现有未知 mode 行为）
2. 执行进度页顶部 Tab：「单 change」｜「批量驾驶舱」，URL param `view` 区分（缺省 `single`）；两 Tab 内容分别承接原 apply Workspace 与 apply-batch Workspace（graph/checkpoint/logs）
3. 批量数据源：`read CURRENT → runs/<runId>/state.json`；无 CURRENT 或文件缺失 → 空态引导（提示在 zapply batch 中启动）；schema 字段与现有 `BatchState` 完全一致（已比对 zskills `batch-state.schema.json`）
4. 批量视图只读：7 条写路由（status/approve/adjust/retry/pause/resume/reset）删除，ApprovalPanel 写控件移除（plan 仅展示）
5. `src/plugins/apply-batch/` 目录删除；`throttle.ts` 随写广播一并删除
6. `pnpm typecheck && pnpm test` 全绿

## 依赖

无前置（独立可交付）。

## 优先级

- P1：数据源错位意味着批量页对新版 zapply 用户已经失效，属功能性修复；合并同时消除信息架构分裂。
