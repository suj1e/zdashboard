# 任务:reload 闪烁修复

- [x] 1. TDD:reload.ts 忽略正则纯函数化并补用例——`.log` 命中、`logs/x.log` 命中、`.log.ts` 不误伤、现有 tmp/`.git` 用例不回归
  - 验收:单测先红后绿
- [x] 2. TDD:App 组件测试——派发 `'reload'` SSE 事件后 `window.location.reload` 未被调用(先红);实现 onReload no-op 至绿
  - 验收:组件测试红→绿
- [ ] 3. 回归 + playground 手验
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);touch 文件后面板不整页刷新且数据更新;写入 `.log` 不触发刷新
