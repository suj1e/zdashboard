## ADDED Requirements

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
