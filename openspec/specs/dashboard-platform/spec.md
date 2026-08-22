# dashboard-platform Specification

## Purpose
TBD - created by archiving change 2026-08-21-cordis-rewrite. Update Purpose after archive.

## Requirements

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

系统 SHALL 提供 `GET /__plugins` 返回已注册插件清单（mode/label/icon/description）；前端 SHALL 以 `import.meta.glob('../plugins/*/web.tsx')` 发现内置插件并与 `/__plugins` 的外部清单合并展示。内置插件前端契约 SHALL 为 `{ mode, label, icon, description?, Sidebar?(lazy), Workspace(lazy) }`：Sidebar 槽可选（由 Shell 渲染框架与折叠交互），Workspace 只负责内容卡（容器背景由 Shell 结构性提供）。外部插件的 iframe viewer 自动获得同款结构化容器，无需修改。

#### Scenario: 内置插件零注册

- **WHEN** 开发者在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）
- **THEN** 无需修改 App.tsx 或任何 core 代码，重启后新插件出现在 IconRail 与首页卡片，内容自动获得统一容器

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治（自带侧栏与内容）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。

#### Scenario: hash 直达

- **WHEN** 打开 `http://localhost:4190/#design`
- **THEN** 直接进入 design 插件工作区；切换插件时 hash 同步更新

### Requirement: CLI 参数（2.0）

CLI SHALL 支持 `--dir <root>`、`--port <n>`、`--open`、`--page <mode>`、`--plugins <dir>`、`--restart`；SHALL NOT 保留 `--mode`。`--page` 仅决定 `--open` 打开 URL 的 hash（含复用路径）；`--restart` 强制停止同目录活实例后重启；`--plugins` 目录下的外部 cordis 插件（index.ts/js/mjs，TS 经 tsx 加载）与内置插件平权挂载，加载失败仅告警不崩溃。

#### Scenario: 外部 TS 插件加载

- **WHEN** `--plugins ./ext` 且 `./ext/my-plugin/index.ts` 导出 cordis 插件
- **THEN** 插件被挂载、其路由可达；文件有语法错误时服务照常启动并打印加载失败日志

### Requirement: 外部插件 Workspace（iframe）

系统 SHALL 支持外部插件向前端贡献可视化界面：外部插件目录下的 `web/` 子目录（含 index.html）自动服务在 `/__plugin/<目录名>/`；manifest 的 `viewerUrl` 字段声明同源查看地址，前端以 sandbox iframe 渲染；mode 与目录名一致且未显式声明 viewerUrl 时自动填充。

#### Scenario: web 目录自动服务与自动填充

- **WHEN** `--plugins ./ext` 且 `./ext/my-skill/web/index.html` 存在，插件 register 了 mode 为 `my-skill` 的 manifest
- **THEN** `GET /__plugin/my-skill/` 返回注入热刷新脚本的 HTML，`/__plugins` 中该条目带 `viewerUrl: '/__plugin/my-skill/'`，前端 `#my-skill` 直达渲染 iframe

#### Scenario: 显式 viewerUrl 优先

- **WHEN** manifest 显式声明 `viewerUrl`（如指向插件自身路由服务的页面）
- **THEN** 前端使用声明值渲染 iframe，自动填充不生效

#### Scenario: 无 web 目录保持占位

- **WHEN** 外部插件目录不含 `web/index.html`
- **THEN** 插件正常挂载、路由可达，前端显示占位工作区，不报错

#### Scenario: 前缀静态服务的路径防护

- **WHEN** 请求 `/__plugin/<name>/../` 之类试图越出插件 web 目录的路径
- **THEN** 返回 403/404，不泄露目录外文件

### Requirement: 同目录单实例复用

系统 SHALL 以 `<root>/.zdev/dashboard.json` 记录运行实例（pid/port/root/startedAt），启动时经双重校验（pid 探活 + `GET /__config` root 比对）判定存活：活实例且未指定 `--restart` 时复用（打开其 URL 并携带 `--page` hash，退出码 0）；任一校验失败视为记录过期，覆盖写新记录。记录须在 listen 成功后以**实际端口**回写。

#### Scenario: 同目录复用

- **WHEN** 项目目录已有活实例，再次执行 `zdashboard --dir <root> --open`
- **THEN** 不启动新进程，打开活实例 URL（含 --page hash），进程以 0 退出并提示已复用

#### Scenario: 陈旧记录自愈

- **WHEN** 记录文件存在但 pid 已死、端口无响应、root 不匹配或文件损坏
- **THEN** 视为过期，正常起新实例并覆盖记录，不报错

#### Scenario: 强制重启

- **WHEN** 指定 `--restart` 且存在活实例
- **THEN** 旧实例收到 SIGTERM（轮询探活、超时 SIGKILL），新实例启动并更新记录

### Requirement: 实例记录清理

系统 SHALL 在 `POST /__stop`、进程 SIGTERM/SIGINT 时 best-effort 清理实例记录；清理失败不构成正确性问题（残留记录由双重校验在下次启动时消化）。

#### Scenario: Ctrl+C 清理

- **WHEN** 运行中的 dashboard 收到 SIGINT
- **THEN** 记录文件被清理（best-effort）后进程退出，just 子进程经清理链回收
