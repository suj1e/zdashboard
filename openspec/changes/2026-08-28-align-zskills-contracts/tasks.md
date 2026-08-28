# 任务:对齐 zskills 新约定

- [x] 1. TDD:`countTasks` 人工条目三分支(人工未勾/人工已勾/无人工)——total/done 剔除 🔧[人工] 项,manual 计数
  - 验收:单测先红后绿
- [ ] 2. `SingleChangeView` 进度用新口径;`manual > 0` 显示「待人工 x 项」;人工条目弱化样式
  - 验收:组件测试断言徽标与进度 100% 语义
- [ ] 3. TDD:App 对 `?p=apply-batch` 重定向 `?p=apply&view=batch`(replace),其余未知 mode 仍回落首页
  - 验收:组件测试先红后绿;落点为批量 Tab
- [ ] 4. 回归 + playground 手验
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);手工 checklist 过
