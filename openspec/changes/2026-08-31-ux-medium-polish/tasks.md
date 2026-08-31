# 任务:UX 中优批次

- [x] 1. App `pluginsReady` 首载骨架 + HomeGrid 卡片骨架(深链接无首页闪现)
  - 验收:组件测试:plugins 空时渲染骨架而非 HomeGrid
- [ ] 2. 断线单源统一(同文案「重连中」+ warning 点 + lost chip 点击强刷)
  - 验收:组件测试:lost 态文案/点击行为
- [ ] 3. iframe 三态(Skeleton/握手 8s 超时 ErrorState/重试重挂)+ 配置失败提示条
  - 验收:组件测试:timeout 渲染 ErrorState、重试 key++
- [ ] 4. server 错误页(404/403 极简 HTML,`/__` API 路径保持 JSON)
  - 验收:单测:Content-Type 与 HTML 断言
- [ ] 5. focus-visible 全局基线 + 移除散落 `focus:outline-none`;slate light primary 对比度达标
  - 验收:CSS 断言/取色核验;🔧[人工] 键盘走查
- [ ] 6. 面包屑末段不截断 + title;design/just 空态引导;`zd-theme` 非法值兜底
  - 验收:组件测试断言各点
- [ ] 7. 回归 + 手验
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
