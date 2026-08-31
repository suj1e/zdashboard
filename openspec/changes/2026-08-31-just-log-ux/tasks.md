# 任务:just 日志体验

- [x] 1. TDD:锚定判定/回底计数纯函数 + runner 参数解析(`hello msg=` → params)与 argv 拼装(特殊字符)
  - 验收:单测先红后绿
- [x] 2. LogViewer 渲染合批(rAF/50ms + memo + seq key)+ elapsed 局部化
  - 验收:组件测试:FakeES 连发 10 事件仅 1 次追加渲染;旧行不重渲
- [x] 3. 滚动锚定 + 「↓ N 行新输出」回底按钮;日志搜索高亮 + 级别 FilterPills
  - 验收:组件测试:上翻不拽底、回底恢复、过滤/高亮生效
- [x] 4. 启停反馈:res.ok 检查 + toast + 按钮 pending 禁用;行数截断显示「1000+ 行」
  - 验收:组件测试:非 2xx toast、pending 至 state 事件
- [x] 5. server:`/__just/recipes` 返回参数清单(懒解析+缓存);start 接受 args;UI 带参启动面板
  - 验收:组件测试:带参 recipe 弹面板、提交携带 args;playground `hello msg=x` 全流程通
- [ ] 6. 回归 + playground 手验(`just lines`/`build`/`hello msg=x`/高频输出合批)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
