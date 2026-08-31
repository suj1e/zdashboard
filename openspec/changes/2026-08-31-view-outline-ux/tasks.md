# 任务:view 大纲体验

- [x] 1. 抽取 `ResizeHandle` 组件(从 SidebarFrame 参数化,横/竖两态);SidebarFrame 切换复用
  - 验收:SidebarFrame 现有宽度/开合/键盘测试不回归
- [x] 2. OutlineNav:title + line-clamp-2 + 拖拽调宽(zd-outline-w 持久化,176–400)+ 缩进封顶
  - 验收:组件测试:长标题两行渲染、title 断言、把手拖宽/双击重置/持久化
- [ ] 3. 回归 + playground 手验(长中文标题文档)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
