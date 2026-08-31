# 任务:数据新鲜度链路

- [x] 1. TDD:useSSE 重连补偿——FakeES 断线→重开→断线期间注册的 `useSSEEvent` 频道 handler 被逐个调用
  - 验收:单测先红后绿
- [x] 2. TDD:usePluginData 重取失败保留旧 data(`error` 独立字段);`!data && error` 才全屏错误
  - 验收:单测先红后绿
- [ ] 3. MdViewer/CodeViewer 订阅 files(300ms 防抖)重取 + 刷新按钮;design viewers 同规则命中当前资产才失效
  - 验收:组件测试:files 事件触发重取、多次触发防抖合并
- [ ] 4. view/Workspace `file` 变化重置 `contentRef.scrollTop = 0`
  - 验收:组件测试:切文件后 scrollTop 为 0
- [ ] 5. 回归 + playground 手验(改 md 后预览自动更新/切文件回顶/断网重连数据更新/瞬时 500 保旧数据)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
