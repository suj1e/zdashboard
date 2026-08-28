# 任务:writeRecord 保留 plugins 段

- [ ] 1. TDD 先写失败测试:有 plugins 保留且 pid/port 更新 / 无 plugins 不新增键 / 损坏 JSON 兜底新建 / tmp+rename 无残留
  - 验收:4 分支单测存在且先红
- [ ] 2. 实现 `writeRecord` 读改写合并 + tmp+rename 原子写
  - 验收:4 分支全绿
- [ ] 3. 回归:`pnpm typecheck && pnpm test` 全绿,instance-strip 用例不回归
  - 验收:typecheck 0 error
