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

前端 SHALL 支持插件间跨导航：`zd-dashboard-nav` 事件（detail `{ mode, filter?, wt? }`）由 Shell 监听并切换目标工作区，向目标插件透传焦点目标（过滤器/change）。内置与外部插件均可派发该事件实现下钻。

#### Scenario: 跨插件聚焦导航

- **WHEN** 任一工作区派发 `zd-dashboard-nav { mode:'apply', wt:'x' }`
- **THEN** Shell 切换至 apply 工作区并聚焦 change x

#### Scenario: 内置插件零注册

- **WHEN** 开发者在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）
- **THEN** 无需修改 App.tsx 或任何 core 代码，重启后新插件出现在 IconRail 与首页卡片，内容自动获得统一容器

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治（自带侧栏与内容）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。Topbar 右侧 SHALL 提供明暗切换与独立的风格选择器（多风格下拉）。

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

系统 SHALL 以 `<root>/.zdev/dashboard.json` 记录运行实例（pid/port/root/startedAt），启动时经双重校验（pid 探活 + `GET /__config` root 比对）判定存活：活实例且未指定 `--restart` 时复用（打开其 URL 并携带 `--page` hash，退出码 0）；任一校验失败视为记录过期，覆盖写新记录。记录须在 listen 成功后以**实际端口**回写。`--restart` 停止旧实例后，新实例 SHALL 优先尝试旧记录端口（用户显式 `--port` 优先），避免端口漂移使已开标签失效。

#### Scenario: 同目录复用

- **WHEN** 项目目录已有活实例，再次执行 `zdashboard --dir <root> --open`
- **THEN** 不启动新进程，打开活实例 URL（含 --page hash），进程以 0 退出并提示已复用

#### Scenario: 陈旧记录自愈

- **WHEN** 记录文件存在但 pid 已死、端口无响应、root 不匹配或文件损坏
- **THEN** 视为过期，正常起新实例并覆盖记录，不报错

#### Scenario: 强制重启

- **WHEN** 指定 `--restart` 且存在活实例
- **THEN** 旧实例收到 SIGTERM（轮询探活、超时 SIGKILL），新实例启动并更新记录

#### Scenario: restart 端口继承

- **WHEN** 4190 端口实例被 `--restart` 替换且端口成功释放
- **THEN** 新实例监听 4190（非顺延端口）；用户未显式指定 --port 时

### Requirement: 实例记录清理

系统 SHALL 在 `POST /__stop`、进程 SIGTERM/SIGINT 时 best-effort 清理实例记录；清理失败不构成正确性问题（残留记录由双重校验在下次启动时消化）。

#### Scenario: Ctrl+C 清理

- **WHEN** 运行中的 dashboard 收到 SIGINT
- **THEN** 记录文件被清理（best-effort）后进程退出，just 子进程经清理链回收

### Requirement: zskills 数据目录约定（.zdev）

系统 SHALL 优先从 `.zdev/` 读取 skill 数据、存量路径回退：bugs 配置（`.zdev/config.yaml` → `.zgoal/config.yaml`）、评审数据（`.zdev/review.yaml` → 根 `review.yaml`）；评审文档列表 SHALL 扫描 `.zdev/*.md`。启动日志 SHALL 打印生效的数据目录。文件变更监听 SHALL 覆盖 `.zdev/` 子目录。

#### Scenario: 配置优先级与回退

- **WHEN** `.zdev/config.yaml` 与 `.zgoal/config.yaml` 并存
- **THEN** bugs 功能读 `.zdev/`；仅存量存在时回退读旧路径不报错

#### Scenario: 评审文档列表

- **WHEN** `.zdev/` 下存在 brief.md/prd.md
- **THEN** `/__docs` 列出它们（根目录 md 不列）；修改 `.zdev/review.yaml` 后前端经 SSE 自动刷新

### Requirement: worktree 感知

apply 进度 SHALL 优先读取 `.zworktree/<change>/openspec/changes/<change>/` 下的 tasks/proposal/design（主目录兜底），卡片标注「worktree 执行中」；`GET /__worktrees` SHALL 返回 `.zworktree/` 下的 worktree 清单（名称/分支）；view 文件树 SHALL 排除 `.zworktree/`。dashboard SHALL NOT 执行任何写 git 操作。

#### Scenario: worktree 进度优先

- **WHEN** 主目录 tasks.md 为空、worktree 内已勾 2/5
- **THEN** apply 卡片显示 2/5 与执行中 badge，不显示 0/5

#### Scenario: 文件树无副本噪音

- **WHEN** 项目存在 `.zworktree/<name>/`（整套代码副本）
- **THEN** view 工作区文件树不显示该目录

### Requirement: worktree 平台级

系统 SHALL 提供平台级 worktree 列表能力：`/__worktrees` 返回全部 `.zworktree/*` worktree（名称/分支/HEAD/脏状态，脏经 `git status --porcelain` 探测）；worktree 数据 SHALL 由 core 层提供（非单个插件私有）。view 工作区文件树 SHALL 提供 Worktrees 分组入口，点击某项 SHALL 经平台内导航事件切换至 apply 视图并聚焦对应 change。dashboard SHALL 只读探测 worktree 状态，不执行 git 写操作。

#### Scenario: worktree 列表含脏状态

- **WHEN** `.zworktree/<name>/` 存在且该目录有未提交改动
- **THEN** `/__worktrees` 返回 `dirty:true`；clean 目录返回 `dirty:false`

#### Scenario: view 树分组与跳转

- **WHEN** 项目存在 `.zworktree/<name>/`，view 树显示 Worktrees 分组（含分支与脏标识）
- **THEN** 点击某 worktree 项，视图切换至 apply 并自动选中/展开对应 change 的 tasks

#### Scenario: 空列表不显示

- **WHEN** 项目无任何 `.zworktree/*`
- **THEN** view 树不显示 Worktrees 分组

### Requirement: 统计卡片下钻

stats 工作区的统计卡片 SHALL 可点击：点击文件/目录/Markdown 类卡片 SHALL 导航至 view 工作区并预设相应过滤，点击变更类卡片 SHALL 导航至 apply 工作区。导航经平台内导航事件完成。

#### Scenario: 统计跳转

- **WHEN** 点击「Markdown 9」卡片
- **THEN** 切至 view 工作区且文件过滤框预填 `.md`；点击「变更 1/2」切至 apply

### Requirement: 依赖激活与交互反馈

系统 SHALL 使用已声明依赖替代手搓实现：禅道配置解析统一走 yaml 包；文件大小/时长格式化使用 filesize/date-fns；树过滤输入经 use-debounce 防抖（≥150ms）；侧栏开合记忆使用 useLocalStorage。关键操作失败（停止服务、just 启停）SHALL 以 toast 通知用户，不只写控制台。

#### Scenario: 配置解析统一

- **WHEN** .zdev/config.yaml 含注释或带引号值
- **THEN** yaml 包正确解析，不再因手搓正则误判

#### Scenario: 错误以 toast 呈现

- **WHEN** just 启停请求失败
- **THEN** 页面右下角出现 toast 错误提示

### Requirement: 共享 UI 原语

前端 SHALL 复用共享组件而非复制实现：Markdown 渲染统一引用 web/viewers/MdViewer；badge 家族统一为 ui/badge 语义变体；目录遍历（walkDir）、进度条（ProgressBar）、筛选药丸（FilterPills）、任务清单解析（parseTasks）各提供单一共享实现供各插件引用。

#### Scenario: 渲染管线单一来源

- **WHEN** Markdown 渲染插件链（rehype/remark）调整
- **THEN** view/review/design 三处预览行为一致更新，无复制版本漂移

#### Scenario: badge 视觉一致

- **WHEN** 任一插件展示状态徽章
- **THEN** 使用统一 Badge 语义变体（success/warning/info/neutral/destructive）

### Requirement: 静态服务与渲染健壮性

静态资产服务 SHALL 支持 HTTP Range 请求（206/Content-Range/Accept-Ranges）并覆盖音视频 MIME，使视频/PDF 可拖动播放；前端 SHALL 不经 innerHTML 字符串拼接渲染不可信内容（token 预览以 React 元素渲染）；请求体读取 SHALL 统一共享实现并监听请求错误，客户端中断不悬挂。

#### Scenario: 视频 seek

- **WHEN** 对 mp4 资产发起 `Range: bytes=0-99` 请求
- **THEN** 返回 206 与 Content-Range，VideoViewer 进度条可拖动

#### Scenario: 中断不悬挂

- **WHEN** 客户端在 POST 途中断开连接
- **THEN** 服务端 readBody settle（空体），无未决 Promise

### Requirement: 主题系统

系统 SHALL 以令牌驱动风格并支持多主题扩展：语义色、圆角、阴影、**字体（--font-sans/--font-mono）、边框宽度（--border-width）** 全部经 CSS 变量定义；**明暗（data-mode: dark/light）与主题（data-theme）正交**；主题清单由注册表声明且 **id 为非联合字符串**（新增主题不改类型定义）。添加主题 SHALL 遵循 SOP：一个主题 CSS 文件（含该主题在 dark/light 两 mode 的取值）+ 一条注册表条目，零组件代码改动（图标类主题额外提供一张图标映射表）。Topbar 风格选择器 SHALL 用 lucide 图标并与状态同步（切换后选中态即时刷新）。

#### Scenario: 零组件改动换风格

- **WHEN** 新增一个风格（如 pixel：实色调板+全直角+无阴影）
- **THEN** 仅通过 globals.css 的 `[data-theme]` 覆盖块与注册表条目实现，git diff 无任何 .tsx 变更（风格选择器等机制文件除外）

#### Scenario: 明暗正交

- **WHEN** 在 pixel 风格下切换明暗
- **THEN** 得到 pixel 的深底/浅底两套像素调色板，风格特征（直角/无阴影/点阵）保持不变

#### Scenario: 语义色跟随主题

- **WHEN** 组件展示成功/警告/信息状态（badge/状态点/提示）
- **THEN** 颜色来自语义令牌，切换主题自动变化，无 tailwind 调色板字面量残留（状态语义类）

#### Scenario: 主题选择与持久化

- **WHEN** 用户在 Topbar 主题选择器切换主题
- **THEN** 全站即时生效并持久化；重启后保持；旧版暗色用户升级后无感迁移

#### Scenario: 新增主题零 tsx

- **WHEN** 新增 Nord 主题（调色板式）
- **THEN** 仅新增 src/web/themes/nord.css 与一条注册表条目，git diff 无任何 .tsx 变更

#### Scenario: 字体与边框随主题

- **WHEN** 主题覆盖 --font-mono 或 --border-width
- **THEN** 使用 font-mono 类的组件（14 处）与 border 类（全站）自动跟随，无组件改类名

#### Scenario: 主题切换即时反馈

- **WHEN** 用户在主题下拉选择 Nord
- **THEN** 菜单选中 Check 立即可见地更新至 Nord（React state 驱动），全站即时换肤并持久化
