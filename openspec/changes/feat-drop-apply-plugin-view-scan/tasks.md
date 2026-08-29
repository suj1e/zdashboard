# 任务:删除 apply 插件,view 扫描 .zdev/apply

- [x] 1. 删除 apply 插件:`git rm -r src/plugins/apply`;`src/plugins/builtin.ts` 移除注册项;typecheck 暴露的 host 残留引用逐一清理(App/router/usePluginData/plugins/icons-modes/manifests 等测试的 apply 用例删除或 stub 化,router merge 语义覆盖转由 stub 承接)
  - 验收:typecheck 零错;`grep -rn "apply" src/ --include="*.ts*"` 无插件残留;全量测试(减 apply 套件)绿
- [x] 2. view 扫描 `.zdev/apply`:walkDir 增 `allowDotDirs` opts(仅目录例外);spec-scan `ScanTreeOptions` 增 `dotDirs`;`core/tree.ts` scanDirs 增 `.zdev/apply`
  - 验收:单测(例外生效/未列入仍跳过/点文件始终跳过/maxDepth 4 覆盖 runs/<id>/state.json);playground 真实 run 数据样本
- [ ] 3. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;playwright:IconRail 无 apply、`?p=apply` 回首页、view 树 `.zdev/apply` 分组可预览 CURRENT/state.json/plan.md、demo/bare 正常、零 console error
  - 验收:全绿 + 冒烟 checklist 入报告
