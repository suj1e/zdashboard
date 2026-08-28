# 任务:parse-tasks CRLF 修复

- [ ] 1. TDD:CRLF 全文 / LF+CRLF 混合单测先红(含 🔧[人工] 条目场景,断言与 LF 基准一致)
  - 验收:测试先红
- [ ] 2. `md.split('\n')` → `md.split(/\r?\n/)`;确认 🔧[人工] 前缀匹配在 CRLF 下同样成立
  - 验收:全绿
- [ ] 3. 回归:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)
  - 验收:typecheck 0 error
