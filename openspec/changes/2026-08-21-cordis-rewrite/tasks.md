# Tasks: zdashboard 2.0 cordis 重写

## Phase 1: core 服务

- [x] 1.1 `src/core/server.ts`：ServerService（route/sse 注册表 + 分发顺序：精确路由 → SPA 资产 → 用户资产兜底；MIME/INJECT/路径穿越防护从旧 server/index.ts 搬；EADDRINUSE 端口递增；stopToken；`GET /__config`、`POST /__stop`；stop → ctx 根清理 → exit）。声明合并类型 `ctx.server`
- [x] 1.2 `src/core/reload.ts`：ReloadService（SSE 连接池经 `ctx.server.sse('/__reload')` 注册；fs.watch 包 ctx.effect；150ms 防抖广播 reload/files）。类型 `ctx.reload`
- [x] 1.3 `src/core/tree.ts`：函数插件挂 `GET /__files`（scanTree + detect 合并 payload，无 design 分支）
- [x] 1.4 `src/core/manifest.ts`：DashboardService（register/list，effect 化注销）+ `GET /__plugins`。类型 `ctx.dashboard`

## Phase 2: 业务插件后端

- [x] 2.1 `src/plugins/just/index.ts`：JustRunner effect 化（dispose 杀子进程）；`GET /__just/recipes`、`GET /__just/logs`(SSE)、`POST /__just/{start,stop,restart}`（stopToken 鉴权 + recipe 校验，行为对齐旧实现）
- [x] 2.2 `src/plugins/bugs/index.ts`：`GET /__bugs` 调 fetchBugs
- [x] 2.3 `src/plugins/review/index.ts`：`GET /__review`、`POST /__review/item`、`POST /__review/status`（stopToken 鉴权）、`GET /__docs`，ReviewStore 复用
- [x] 2.4 `src/plugins/apply/index.ts`：scan.ts 抽出 scanApplyChanges/readApplyChange；`GET /__apply`、`GET /__apply/change?name=`
- [x] 2.5 `src/plugins/design/index.ts`：`GET /__design/assets` 调 scanAssets
- [x] 2.6 `src/plugins/view/index.ts`：空 apply（仅 logger.info，web only）

## Phase 3: 前端

- [x] 3.1 `src/web/lib/plugins.ts`：`import.meta.glob('../../plugins/*/web.tsx')` 注册表 + 固定顺序排序 + `GET /__plugins` 外部插件合并（占位 Workspace）+ WebPlugin 类型
- [x] 3.2 六个 `src/plugins/*/web.tsx` 前端契约（mode/label/icon/description/Workspace lazy）；旧 `index.tsx` 前端 manifest 删除
- [x] 3.3 `src/plugins/view/Workspace.tsx`：现有 FileTree + viewer 组合迁入（FileTree 移入插件；删日志/插件入口）；`src/plugins/design/Workspace.tsx`：DesignViewer 改拉 `/__design/assets`；`src/plugins/just/Workspace.tsx`：LogViewer 迁入；bugs/review/apply Workspace 引用现有 Viewer
- [x] 3.4 `src/web/layout/IconRail.tsx`（48px 图标栏：首页+插件，active 高亮，tooltip）+ `src/web/layout/StatusBar.tsx`（host/项目路径/SSE 状态点；项目路径来自 /__config）
- [x] 3.5 `src/web/home/HomeGrid.tsx`：插件卡片网格 + 探测信息行（openspec/docs/just/bugs）
- [x] 3.6 `src/web/App.tsx` 重写为 Shell：Topbar（去树折叠钮）+ IconRail + Workspace + StatusBar；hash 直达（`#<mode>` 驱动选中、切换写 hash）；删除 startupMode/--mode 逻辑与 loadPlugin switch

## Phase 4: 入口与收尾

- [x] 4.1 `src/cli.ts` 重写：parse args（--dir/--port/--open/--page/--plugins）→ detect → new Context() → 挂 core + 六插件 → 外部插件（tsx 加载 index.{ts,js,mjs}，失败不崩溃）→ banner。删除旧 `src/server/index.ts`、`src/server/plugins.ts`
- [x] 4.2 构建：package.json version 2.0.0、cordis 锁 `4.0.0-rc.8` 无前缀、dependencies 加 tsx；vite proxy 补 `/__design` `/__plugins`；`pnpm build` 全绿
- [ ] 4.3 验证：vitest 全绿；冒烟（/__config /__plugins /__files /__apply /__design/assets；SSE /__reload 变更广播；POST /__stop 清理退出）；浏览器过首页→切换→#design 直达→文件预览
- [ ] 4.4 README 更新：新架构图、新 CLI 用法（--page 替代 --mode 的迁移说明）、插件契约（web.tsx + apply(ctx)）
