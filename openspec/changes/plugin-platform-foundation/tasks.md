# 任务:插件平台地基(plugin-platform-foundation)

> 顺序即执行序;每项完成后 `pnpm build && pnpm test` 保持绿。

- [ ] T1 core route 助手 + SDK server 侧:core/server.ts 导出 json()/guarded();新建 `src/sdk/server.ts`(definePlugin/PluginContext);cli.ts 内置注册改 BUILTIN_PLUGINS.map
  - 测试验收:vitest 覆盖 register manifest、route json 包装、guardedRoute 无 token 403、onDispose;`pnpm test` 绿
- [ ] T2 SDK client 侧 + 注册表改造:`src/sdk/client.tsx`(defineWebPlugin,lazy 类型强制)+ `src/sdk/shared.ts`(ParamSchema);web/lib/plugins.ts ORDER→manifest.order、删 bugs/review 残留项、旧 web.tsx 兼容分支
  - 测试验收:六旧插件经兼容分支在 /__plugins 与页面可见;排序按 order 字段
- [ ] T3 URL 路由:`src/web/router.ts`(useRoute/navigate/pushState/popstate);App.tsx 接线;删 hash 路由、navTarget、navToken、zd-dashboard-nav;`#mode` 旧深链接重定向
  - 测试验收:vitest navigate merge/null 删键/replace/popstate/重定向;手测 ?p=view 直开、刷新保持、后退回首页、旧 #view 链接跳转正常
- [ ] T4 kit 组件库 + PluginPage:PageHeader/Toolbar/SectionCard/EmptyState/ErrorState/Skeleton/Chip/IconButton/DataList/KeyValue + PluginPage + AsyncBoundary;全接现有 CSS 变量 token
  - 测试验收:vitest 三态边界渲染分支 + PageHeader/Toolbar/EmptyState 快照;三主题×明暗肉眼走查无样式破相
- [ ] T5 数据层:usePluginData(缓存/去重/subscribe 失效);ReloadService broadcastPlugin → `plugin:<mode>:<event>`;新增 `/__detect` 路由;HomeGrid 探测切 /__detect
  - 测试验收:vitest 缓存/去重/事件失效/error 态;curl /__detect 返回四探测位;just start/stop 触发 SSE 事件可在 DevTools EventSource 看到 plugin:just:*
- [ ] T6 壳层接线:IconRail/HomeGrid 图标切 useIcons(mode→icon 映射);SidebarFrame props 收窄;App 挂 PluginPage 骨架(旧插件内容暂以兼容分支渲染)
  - 测试验收:六旧插件页面打开无 console error;图标非 emoji;首页卡片排序与外部插件「外部」徽标正常
- [ ] T7 收尾冒烟:build + test 全绿;手工冒烟清单(design.md 测试策略 §2)全过
  - 测试验收:六页面 + 首页 + 主题切换 + 深链接刷新/后退零 console error
