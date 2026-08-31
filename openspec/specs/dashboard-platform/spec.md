# dashboard-platform Specification

## Purpose
TBD - created by archiving change 2026-08-21-cordis-rewrite. Update Purpose after archive.
## Requirements
### Requirement: cordis 插件运行时

系统 SHALL 以 cordis@4.0.0-rc.8 作为插件运行时：core 服务（server/reload/tree/manifest）与业务插件（stats/view/design/just）全部为 cordis 插件，通过 `ctx.server.route()` / `ctx.server.sse()` 注册能力，注册自动 effect 化，插件卸载时逆序回收副作用。

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

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治，侧栏为可选槽位（无侧栏需求的插件如 just 直接全宽主区）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。Topbar 右侧 SHALL 提供明暗切换与独立的风格选择器（多风格下拉）。

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

系统 SHALL 按约定从 `<root>/.zdev/` 读取 skill 产出数据：design 插件扫描 `.zdev/design/`（zdesign/zasset 产出根）。文件变更监听 SHALL 覆盖 `.zdev/` 子目录，数据写入后相关插件视图经 SSE 静默刷新。

#### Scenario: 配置优先级与回退

- **WHEN** `.zdev/config.yaml` 与 `.zgoal/config.yaml` 并存
- **THEN** 系统不读取二者（bugs 插件已移除，遗留文件仅作为存量被忽略）

#### Scenario: 评审文档列表

- **WHEN** `.zdev/` 下存在 brief.md/prd.md
- **THEN** 不再生成评审文档列表（review 插件已移除）；md 文件仅在位于约定扫描目录时被 view/design 浏览

### Requirement: worktree 平台级

系统 SHALL 提供平台级 worktree 列表能力：`/__worktrees` 返回全部 `.zworktree/*` worktree（名称/分支/HEAD/脏状态，脏经 `git status --porcelain` 探测）；worktree 数据 SHALL 由 core 层提供（非单个插件私有）。view 工作区文件树 SHALL 将各 worktree 以独立分组呈现（含分支与脏标识），分组内展开该 worktree 约定目录（openspec/docs）的文件树；view 文件树 SHALL 排除 `.zworktree/` 目录本身。dashboard SHALL 只读探测 worktree 状态，不执行 git 写操作。

#### Scenario: worktree 列表含脏状态

- **WHEN** `.zworktree/<name>/` 存在且该目录有未提交改动
- **THEN** `/__worktrees` 返回 `dirty:true`；clean 目录返回 `dirty:false`

#### Scenario: view 树分组与跳转

- **WHEN** 项目存在 `.zworktree/<name>/`，view 树显示 Worktrees 分组（含分支与脏标识）
- **THEN** 展开分组仅呈现该 worktree 约定目录（openspec/docs）下的文件，不切换至已移除的 apply 视图

#### Scenario: 空列表不显示

- **WHEN** 项目无任何 `.zworktree/*`
- **THEN** view 树不显示 Worktrees 分组

### Requirement: 依赖激活与交互反馈

系统 SHALL 使用已声明依赖替代手搓实现：文件大小/时长格式化使用 filesize/date-fns；树过滤输入经 use-debounce 防抖（≥150ms）。关键操作失败（停止服务、just 启停）SHALL 以 toast 通知用户，不只写控制台。

#### Scenario: 配置解析统一

- **WHEN** `.zdev/config.yaml` 含注释或带引号值
- **THEN** 系统不再解析该文件（bugs 插件已移除，遗留配置文件仅作为存量被忽略）

#### Scenario: 错误以 toast 呈现

- **WHEN** just 启停请求失败
- **THEN** 页面右下角出现 toast 错误提示

### Requirement: 共享 UI 原语

前端 SHALL 复用共享组件而非复制实现：Markdown 渲染统一引用 web/viewers/MdViewer；badge 家族统一为 ui/badge 语义变体；目录遍历（walkDir）、进度条（ProgressBar）、筛选药丸（FilterPills）、任务清单解析（parseTasks）各提供单一共享实现供各插件引用。

#### Scenario: 渲染管线单一来源

- **WHEN** Markdown 渲染插件链（rehype/remark）调整
- **THEN** view/design 两处预览行为一致更新，无复制版本漂移

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

系统 SHALL 以令牌驱动风格并支持多主题扩展：**语义色、字号、字体族、圆角、边框宽度、阴影、图标集** 全部经 CSS 变量或主题注册表定义；**明暗（data-mode: dark/light）与主题（data-theme）正交**；主题清单由注册表声明且 **id 为非联合字符串**（新增主题不改类型定义）。添加主题 SHALL 遵循 SOP：一个主题 CSS 文件（含该主题在 dark/light 两 mode 的取值）+ 一条注册表条目 + 可选图标映射表，**零组件代码改动**（组件 class 名、图标库引用、px 值等全部走变量/注册表）。Topbar 风格选择器 SHALL 用 lucide 图标并与状态同步（切换后选中态即时刷新）。

#### Scenario: 零组件改动换风格

- **WHEN** 新增一个风格（如 pixel：实色调板+全直角+无阴影+像素字体+放大字号）
- **THEN** 仅通过主题 CSS 文件覆盖变量与注册表条目实现，git diff 无任何 .tsx 变更（机制文件除外）

#### Scenario: 明暗正交

- **WHEN** 在 pixel 风格下切换明暗
- **THEN** 得到 pixel 的深底/浅底两套像素调色板，风格特征（直角/无阴影/点阵/VT323 字体/放大字号）保持不变

#### Scenario: 语义色跟随主题

- **WHEN** 组件展示成功/警告/信息状态（badge/状态点/提示）
- **THEN** 颜色来自语义令牌，切换主题自动变化，无 tailwind 调色板字面量残留（状态语义类）

#### Scenario: 主题选择与持久化

- **WHEN** 用户在 Topbar 主题选择器切换主题
- **THEN** 全站即时生效并持久化；重启后保持；旧版暗色用户升级后无感迁移

#### Scenario: 新增主题零 tsx

- **WHEN** 新增 Nord 主题（调色板式+自定义字号+图标集）
- **THEN** 仅新增 src/web/themes/nord.css 与一条注册表条目与图标映射表，git diff 无任何 .tsx 变更

#### Scenario: 字体与边框随主题

- **WHEN** 主题覆盖 --font-sans/--font-mono、--border-width、--radius-*、--text-*
- **THEN** 使用对应令牌的组件（font-family、border、rounded、font-size 类）自动跟随，无组件改类名

#### Scenario: 图标集随主题

- **WHEN** 主题注册表声明 iconSet 且组件通过 useIcons() hook 渲染图标
- **THEN** 切换主题后全部图标自动切换为对应风格（lucide / pixelarticons / 其他），无组件改 import

#### Scenario: 字号随主题

- **WHEN** 主题覆盖 --text-xs/--text-sm/--text-base/--text-lg 或 --text-10/--text-11
- **THEN** 使用对应字号类的组件自动跟随主题缩放，无组件改 px 值

#### Scenario: 主题切换即时反馈

- **WHEN** 用户在主题下拉选择 Nord
- **THEN** 菜单选中 Check 立即可见地更新至 Nord（React state 驱动），全站即时换肤并持久化

### Requirement: 统一插件 SDK 与元数据单源

系统 SHALL 提供 `definePlugin`(server 侧)与 `defineWebPlugin`(client 侧)作为插件唯一声明入口;插件元数据(manifest:mode/label/icon/description/config schema)SHALL 在每插件一个 `manifest.ts` 中只声明一次,server 与 client 两端 import 同一份常量。SDK SHALL 内部完成 cordis 注册、dashboard.register 与生命周期清理,插件代码不得再出现手写 `writeHead` 样板与 `(ctx as any)` 强转。

#### Scenario: 元数据物理单源

- **WHEN** 在任意插件中 grep label/icon/description 的声明点
- **THEN** 每个字段全仓只出现一次(该插件的 manifest.ts);`/__plugins` 返回值与前端 Rail/HomeGrid 显示来自同一份常量

#### Scenario: 写操作强制鉴权

- **WHEN** 插件通过 SDK 的 `guardedRoute` 注册 POST 路由且请求未携带正确 `x-stop-token`
- **THEN** 返回 403,handler 不执行

### Requirement: URL 路由承载插件选择与插件内状态

前端 SHALL 以 searchParams(`?p=<mode>&<params>`)承载当前插件与插件内状态,基于 history API 实现前进/后退/刷新/深链接;`navigate` SHALL 支持 params 合并与 null 删键。旧机制(hash 路由、`zd-dashboard-nav` 事件、navTarget/navToken 强制重挂载)SHALL 全部删除;旧 `#<mode>` 深链接 SHALL 重定向到 `?p=<mode>`。

#### Scenario: 深链接直达

- **WHEN** 浏览器直接打开 `/?p=view&wt=…&file=…` 并刷新
- **THEN** view 插件打开且定位到指定 worktree 与文件,无整页重挂载

### Requirement: PluginPage 统一页面模板与平台组件库

SDK SHALL 提供 `PluginPage` 模板(PageHeader + AsyncBoundary + 内容区);加载/错误/空三态 SHALL 由 AsyncBoundary 统一渲染,插件不自行实现状态 UI。平台组件库(kit)SHALL 提供至少 PageHeader/Toolbar/EmptyState/ErrorState/Skeleton 等组件,全部接入现有 CSS 变量 token,三套主题(default/nord/pixel)× 明暗切换无需适配改动。

#### Scenario: 三态一致

- **WHEN** 任一插件页面处于加载中 / 请求失败 / 数据为空
- **THEN** 分别渲染 Skeleton / ErrorState(含重试)/ EmptyState,视觉与交互模式在六个插件间一致

### Requirement: 统一数据层与插件级 SSE 频道

前端 SHALL 提供 `usePluginData(key, fetcher, { subscribe })`:模块级缓存 + 同 key 去重 + subscribe 指定的 SSE 事件到达时自动失效重取。ReloadService SHALL 支持插件级广播事件 `plugin:<mode>:<event>`;既有 reload/files/config 事件保持不变。

#### Scenario: 事件失效重取

- **WHEN** 服务端调用 `broadcast(mode, 'state')` 且某组件以 subscribe='plugin:<mode>:state' 使用 usePluginData
- **THEN** 该组件的 fetcher 自动重新执行并更新 UI,无需轮询

### Requirement: 项目探测独立接口

系统 SHALL 提供 `GET /__detect` 返回项目探测位(openspec/docs/just);HomeGrid SHALL 改为从该接口获取探测数据,不再依赖 `/__files` 文件树响应搭车返回(过渡期字段保留,由 bridge-cleanup change 摘除)。

#### Scenario: 首页探测不再拉全量文件树

- **WHEN** 用户打开首页
- **THEN** 探测 chips 数据来自 `/__detect`,浏览器 Network 中不因首页探测发起 `/__files` 请求

### Requirement: 插件内状态全部承载于 URL

四个内置插件的页面内状态 SHALL 按 manifests 的 ParamSchema 契约承载于 searchParams:view 为 `wt/file/filter`，just 为 `recipe/task`，design 为 `type/asset/folder`，stats 钻取来源为 `card`。刷新与分享深链接 SHALL 完整恢复页面状态。

#### Scenario: view 状态恢复

- **WHEN** 在 view 中展开某 worktree 并打开一个文件后复制 URL，在新标签页打开
- **THEN** 同一 worktree 分组与文件被还原选中并渲染预览

### Requirement: stats 跨插件钻取

stats 卡片 SHALL 做实钻取:点击 Worktree 卡片 SHALL 导航至 view(`?p=view`);点击未提交卡片 SHALL 导航至 view 并携带 dirty 高亮上下文。钻取 SHALL 经 URL navigate 实现,不使用自定义事件。

#### Scenario: Worktree 卡片跳转

- **WHEN** 点击 stats 页的 Worktree 卡片
- **THEN** URL 变为 `?p=view`(可带 card=worktree 标记)且 view 插件打开

### Requirement: just 多任务并发视图

just 插件不设侧边栏:主区 LogViewer 内嵌任务列表为唯一任务选择面,并发运行多个 recipe 时在该列表展示运行态并点击切换主区日志;各任务日志 SHALL 按 taskId 隔离互不串扰。server 侧 SHALL 支持多任务并发执行(若现有 JustRunner 为单实例则改造为 runner 池)。

#### Scenario: 并发双任务日志隔离

- **WHEN** 同时启动两个 recipe
- **THEN** LogViewer 内嵌任务列表出现两个活跃条目,分别点开显示各自日志,内容无交叉

#### Scenario: 无侧边栏布局

- **WHEN** 用户从 IconRail 进入 just 插件
- **THEN** 页面仅渲染主区(LogViewer 全宽),SidebarFrame 按 `plugin?.Sidebar` 判空收栏,任务选择经内嵌列表完成并写回 `recipe`/`task` URL 参数

### Requirement: 外部插件沙箱与 postMessage 桥

外部插件 iframe SHALL 仅使用 `allow-scripts` 沙箱(不含 allow-same-origin);外部插件与宿主 SHALL 经 postMessage 桥通信,协议消息 SHALL 携带 `source: 'zdashboard'` 防串扰字段,支持 `zd:ready`/`zd:init`/`zd:theme`/`zd:navigate`/`zd:fetch`/`zd:fetch:result`/`zd:config`。数据请求 SHALL 由宿主代理:默认放行 `/__` 前缀路径,其余拒绝并回传 403。外部插件自动接线约定(mode === 目录名、web/index.html → viewerUrl)SHALL 保持不变,存量 playground demo/bare 样例无需修改即可运行。

#### Scenario: 白名单代理

- **WHEN** 外部插件经 `zd:fetch` 请求 `/__stats/data` 与 `/etc/passwd`
- **THEN** 前者由宿主代理返回 200 与数据;后者被拒绝回传 403,浏览器无跨域报错

#### Scenario: 主题与导航同步

- **WHEN** 用户切换主题或外部插件发起 `zd:navigate`
- **THEN** iframe 实时收到 `zd:theme` 同步;宿主按 navigate params 执行插件跳转

### Requirement: 插件序列完成冒烟关口

plugin-platform change 序列 SHALL 以端到端冒烟作为完成关口:全部内置插件页面、首页、外部 demo 插件、三套主题×明暗、深链接刷新/后退全部走查,console 零 error;已移除插件的残留(detect 旧链、vite 代理、死 CSS 变量、孤儿类型、启动日志字段)SHALL 清零。

#### Scenario: 残留清零核验

- **WHEN** 在 src/ 与 vite.config.ts 中 grep 已移除插件的标识符与代理路径
- **THEN** 全部无命中

### Requirement: 内置插件统一 SDK 形态

stats/view/design/just 四个内置插件 SHALL 全部以 `definePlugin`(server)与 `defineWebPlugin`(client)声明，manifest 为 server/client 共享单源。内置插件零注册：在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）并接入注册表后，无需修改 App.tsx 或任何 core 代码，新插件即出现在 IconRail 与首页卡片。

#### Scenario: 四插件注册表自洽

- **WHEN** 启动 zdashboard 并请求 `/__plugins`
- **THEN** 返回 stats/view/design/just 四个 manifest，无已移除插件（apply/apply-batch/market/bugs/review）残留

#### Scenario: apply-batch 鉴权与实时性

- **WHEN** 在 src/ 与 vite.config.ts 中检索 apply-batch 路由、guardedRoute 写操作与 `plugin:apply-batch:state` 频道
- **THEN** 全部无命中（apply 插件已于 601171d 连同批量驾驶舱一并移除）

