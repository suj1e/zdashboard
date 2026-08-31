# 任务:移除 market 插件

- [x] 1. spec REMOVED delta:specs/dashboard-platform/spec.md 移除「灵感市场插件」requirement(全文含 4 scenario)
  - 验收:`openspec validate` 通过,deltaCount=1(REMOVED)
- [x] 2. 删 `src/plugins/market/` 整目录;cli.ts 去 import+注册;manifests.test 去 market 行;icons.tsx 去 market 映射(sparkles 本体保留,先 grep 使用点)
  - 验收:`grep -ri market src/ --include="*.ts" --include="*.tsx"` 零命中;typecheck 0 error
- [x] 3. README.md market 段落清理(实施时 grep 确认)
  - 验收:grep README 零命中
- [ ] 4. 回归 + playground 手验:IconRail 5 插件、`?p=market` 回落首页
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);手工 checklist 过
