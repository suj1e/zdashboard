# 任务:just 去侧边栏

- [ ] 1. 删 `src/plugins/just/Sidebar.tsx`;`web.tsx` 移除 sidebar 导出
  - 验收:`?p=just` 页无侧栏;IconRail→just 直达主区
- [ ] 2. `just/test/frontend.test.tsx` 改写:删侧栏断言,任务选择断言落 LogViewer 内嵌列表(点 recipe → URL param)
  - 验收:测试通过且覆盖选择链路
- [ ] 3. 回归:`pnpm typecheck && pnpm test` 全绿;playground 手验任务点选/启停/清屏
  - 验收:typecheck 0 error;手工 checklist 过
