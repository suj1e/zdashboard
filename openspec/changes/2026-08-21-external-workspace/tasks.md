# Tasks: 外部插件 Workspace 动态加载

- [x] 1.1 `src/core/server.ts`：ServerService 新增 `static(prefix, dir)`（前缀 Map、effect 化注销、目录请求落 index.html、HTML 注入 INJECT、路径穿越防护）；分发顺序插入「精确路由 → /__plugin 前缀 → SPA → 用户资产」
- [x] 1.2 `src/core/manifest.ts`：PluginManifest 加 `viewerUrl?: string`；DashboardService 加 `get(mode)`
- [x] 1.3 `src/cli.ts` loadExternal：挂载后 `await fiber`，探测 `<dir>/web/index.html` → `ctx.server.static('/__plugin/<name>/', webDir)`；mode===目录名且无 viewerUrl → 自动填充重注册
- [x] 1.4 前端：`src/web/components/ExternalWorkspace.tsx`（iframe + sandbox 同源组合）；`src/web/lib/plugins.ts` 外部 manifest 带 viewerUrl → 用 ExternalWorkspace；HomeGrid 外部插件加「外部」标记（若未有）
- [x] 1.5 Fixture：`test-server/ext-plugins/demo/`（index.ts 注册 manifest + /__demo/api + web/index.html 调 API 展示）；`test-server/ext-plugins/bare/`（仅 index.ts，验证占位）
- [x] 1.6 README：外部插件编写指南（目录结构、web/ 约定、viewerUrl 覆写、热刷新、sandbox）
- [x] 1.7 验证：pnpm build + vitest 全绿；冒烟（/__plugins 含 viewerUrl、/__plugin/demo/ 200、穿越防护、/__demo/api、浏览器 #demo iframe 渲染 + 改文件热刷新、bare 占位、/__stop 干净退出）
