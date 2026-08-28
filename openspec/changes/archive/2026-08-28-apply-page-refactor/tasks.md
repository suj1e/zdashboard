# 任务:apply 页面重构

- [x] 1. `ViewHeader` 局部组件抽取,SingleChangeView/BatchView 统一接入
  - 验收:组件测试断言两 Tab header 结构一致
- [x] 2. SingleChangeView 分栏:左列 w-72 摘要列表(选中高亮/写 change param)+右列详情;`lg:` 起分栏、小屏堆叠
  - 验收:组件测试:点列表项写 URL 且右列切换;lg 断点分栏结构存在
- [x] 3. BatchView 分区:概览条(runId/状态/批次/并发度/plan 入口)+中部 graph/checkpoint 切换+底部 h-48 固定高日志区
  - 验收:组件测试:概览条元素、日志容器类、空态引导保留
- [x] 4. 回归:🔧[人工] 徽标、`?p=apply-batch` 重定向、view 非法回落全部不回归;playground 手验(含小屏)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);手工 checklist 过
