## Why

zskills 生态两处新约定与 dashboard 当前行为脱节：

1. **zdash 启动器文档仍把 `#apply-batch` 列为合法直达模式**——本日 apply+apply-batch 合并（2026-08-28-apply-merge-progress）后该深链回落首页，zdash 用户与旧书签全部断链。
2. **zapply 新增 `🔧[人工]` 任务标记约定**——tasks 里 `- [ ] 🔧[人工]` 前缀条目（数据库执行/部署/人眼验证）craftsman 永不勾选，官方完成度口径是 x/y **不含**这类项。dashboard apply 单 change 视图用 `parseTasks`/`countTasks` 算进度，会把这类项永远算成未完成，进度条对含人工动作的 change 永远到不了 100%。

## What Changes

- App 未知 mode 回落首页前拦截 `apply-batch`：重定向到 `?p=apply&view=batch`（replace 语义，不污染历史）
- apply 单 change 视图进度口径:`countTasks`/`parseTasks` 剔除 `🔧[人工]` 前缀条目；UI 在进度区单独展示「待人工 x 项」（有才显示）

## 成功标准

1. `?p=apply-batch` 落在执行进度插件批量 Tab，URL 变为 `?p=apply&view=batch`，不残留 apply-batch
2. 含 `- [ ] 🔧[人工]` 条目的 change:进度分母不含它们；人工条目计数单独显示
3. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/archive/2026-08-28-apply-merge-progress/（已归档）

## 优先级

- P2：断链与口径错误影响真实用户路径，量小价值明确。
