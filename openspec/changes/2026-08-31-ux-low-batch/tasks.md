# 任务:UX 低优批次

- [x] 1. `safeStorage` 工具 + 全仓 localStorage 直调点接入(ThemeToggle/StyleSelect/main)
  - 验收:单测:正常读写/抛异常不崩
- [x] 2. reduced-motion:globals.css 媒体查询 + live 点静态化 + hover scale 关闭
  - 验收:CSS 断言;组件测试:reduce 下无 pulse 类
- [x] 3. 持久化三处:view 折叠集合/design 分组与视口/`zd-` 键规范
  - 验收:组件测试:rerender 后保持
- [x] 4. 复制失败反馈 + usePluginData 刷新轻 spinner;aria-expanded/日志 role=log/热区 24px
  - 验收:组件测试各点断言
- [ ] 5. 文案基线(clean→干净)+ design 工具栏度量统一 + `\r` 分段 + logs 频道迁移评估落地
  - 验收:组件/单测各点;实施深度偏差在报告说明
- [ ] 6. 回归 + 手验
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
