# 任务:spec 与现实对齐

- [ ] 1. 落盘 specs/dashboard-platform/spec.md delta:8 MODIFIED + 3 REMOVED(逐字匹配主 spec requirement 标题)
  - 验收:`openspec show 2026-08-31-spec-sync-plugin-reality --json --deltas-only` deltaCount=11;validate 通过
- [ ] 2. 归档合并,主 spec 核验:grep 无插件级 apply/apply-batch/bugs/review/market/禅道/zd-dashboard-nav 残留(cordis `apply(ctx)` API 语义除外)
  - 验收:grep 零插件级残留;归档成功
- [ ] 3. push 交付
  - 验收:origin/main 同步
