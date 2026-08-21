# Dashboard Platform 能力规格（2.0）

## ADDED Requirements

### Requirement: cordis 插件运行时

系统 SHALL 以 cordis@4.0.0-rc.8 作为插件运行时：core 服务（server/reload/tree/manifest）与业务插件（just/bugs/review/design/apply/view）全部为 cordis 插件，通过 `ctx.server.route()` / `ctx.server.sse()` 注册能力，注册自动 effect 化，插件卸载时逆序回收副作用。

#### Scenario: 插件注册即回收

- **WHEN** 插件在 `apply(ctx)` 中调用 `ctx.server.route(path, handler)`
- **THEN** 路由立即可达，且插件 dispose 后该路由返回 404，无需插件手写注销

#### Scenario: 停止触发统一清理

- **WHEN** 客户端携带正确 stopToken `POST /__stop`
- **THEN** 系统逆序执行全部插件清理（含 just 子进程 kill、fs.watch 关闭、SSE 断开）后退出进程，无残留子进程

### Requirement: HTTP 服务骨架

系统 SHALL 提供 `ctx.server` 服务：单 HTTP server 按顺序分发（精确路由表 → SPA 静态资产 → 项目用户资产兜底），含端口占用递增重试、MIME 映射、用户 HTML 的 reload 注入、路径穿越防护、stopToken 鉴权的 `/__config` 与 `/__stop` 端点。

#### Scenario: 路由分发顺序

- **WHEN** 请求 `GET /__files` 且 tree 插件已注册该路由
- **THEN** 命中精确路由表，返回文件树 JSON；未注册的 `__` 前缀路径回退到静态/用户资产逻辑

#### Scenario: 端口占用

- **WHEN** 默认端口 4190 被占用
- **THEN** 服务自动尝试 4191 并照常启动，banner 打印实际端口

### Requirement: 插件清单与前端发现

系统 SHALL 提供 `GET /__plugins` 返回已注册插件清单（mode/label/icon/description）；前端 SHALL 以 `import.meta.glob('../plugins/*/web.tsx')` 发现内置插件（真实 Workspace 组件），并与 `/__plugins` 的外部清单合并展示（外部插件为占位工作区）。

#### Scenario: 内置插件零注册

- **WHEN** 开发者在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约）
- **THEN** 无需修改 App.tsx 或任何 core 代码，重启后新插件出现在 IconRail 与首页卡片

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治（自带侧栏与内容）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。

#### Scenario: hash 直达

- **WHEN** 打开 `http://localhost:4190/#design`
- **THEN** 直接进入 design 插件工作区；切换插件时 hash 同步更新

### Requirement: CLI 参数（2.0）

CLI SHALL 支持 `--dir <root>`、`--port <n>`、`--open`、`--page <mode>`、`--plugins <dir>`；SHALL NOT 保留 `--mode`（破坏性变更，版本升至 2.0.0）。`--page` 仅决定 `--open` 打开 URL 的 hash，不影响插件启停；`--plugins` 目录下的外部 cordis 插件（index.ts/js/mjs，TS 经 tsx 加载）与内置插件平权挂载，加载失败仅告警不崩溃。

#### Scenario: 外部 TS 插件加载

- **WHEN** `--plugins ./ext` 且 `./ext/my-plugin/index.ts` 导出 cordis 插件
- **THEN** 插件被挂载、其路由可达；文件有语法错误时服务照常启动并打印加载失败日志
