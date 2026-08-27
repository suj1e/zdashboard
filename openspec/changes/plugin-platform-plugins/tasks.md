# 任务:六插件迁移与页面重写(plugin-platform-plugins)

> 前置:plugin-platform-foundation 已合入。顺序即执行序;每项完成后 `pnpm build && pnpm test` 保持绿。

- [x] T1 stats 迁移:manifest.ts 单源 + definePlugin/defineWebPlugin;页面套 PluginPage(5 卡片 + Top10 + 探测区);钻取 navigate 做实;探测切 /__detect;删 (ctx as any) 与死 navTarget 代码
  - 测试验收:页面冒烟零 console error;点 Worktree 卡 → ?p=view 打开;点未提交卡 → view 高亮 dirty;manifest 参数表驱动单测过
- [ ] T2 view 迁移:wt/file/filter 入 URL(ParamSchema);worktree 分组树 + 折叠 + OutlineNav 保留;预览器套 kit;面包屑 PageHeader
  - 测试验收:深链接 ?p=view&wt=…&file=… 刷新直达;分组折叠/过滤正常;树滚动位置在 params 变化时保持
- [ ] T3 apply 迁移:change 入 URL;任务树 + 进度条套模板;空态 EmptyState
  - 测试验收:切换 change URL 变化;无 change 空态正确
- [ ] T4 design 迁移:manifest.config 单源(多文件夹);分组侧栏 + 预览套模板;PageViewer/TokenViewer 拆独立文件
  - 测试验收:配置 folders 增删生效;九类资产渲染;配置改动保存后 SSE config 事件触发重取
- [ ] T5 just 迁移:**先核实 JustRunner 并发能力**(单 runner 则 server 改 runner 池 + plugin:just:log 按 taskId 携带载荷);活跃任务侧栏 + LogViewer 套模板;recipes 用 usePluginData
  - 测试验收:并发 2 recipe 侧栏双条目、日志独立;单测日志按 taskId 隔离
- [ ] T6 apply-batch 迁移:十条路由迁 SDK(写操作全 guardedRoute);store 变更 broadcast('state') + 500ms 节流;前端切 usePluginData subscribe、删 2s 轮询、store 改 import type;三视图套模板
  - 测试验收:未带 token POST /approve 403;store 变更 <1s UI 更新且 DevTools 无轮询;SSE 节流单测过
- [ ] T7 收尾:删除 foundation 兼容分支(web/lib/plugins.ts);全量手工走查六插件 + 三主题×明暗 + 全部深链接;build + test 全绿
  - 测试验收:grep 兼容分支无结果;走查清单零 console error
