# 设计:六插件迁移与页面重写(plugin-platform-plugins)

## 背景

地基(SDK/URL 路由/kit/PluginPage/数据层)由 plugin-platform-foundation 交付。本 change 把六个插件从旧双入口形态迁到 SDK,并按统一模板重写页面。总体分层见 [../plugin-platform-foundation/diagrams/architecture.html](../plugin-platform-foundation/diagrams/architecture.html);六插件落位见 [diagrams/pages-map.html](diagrams/pages-map.html)。

## 六插件页面设计

重写顺序由简到繁:stats → view → apply → design → just → apply-batch。

| 插件 | 页面结构 | 关键变化 |
|---|---|---|
| **stats** | PageHeader + 5 卡片栅格(文件/目录/总大小/Worktree/未提交)+ 类型 Top10 + 探测区 | 钻取做实:Worktree 卡 → `navigate({p:'view'})`;未提交卡 → view 高亮 dirty;探测改 /__detect;删除 (ctx as any) 与死 navTarget 代码 |
| **view** | PageHeader(面包屑:worktree/路径)+ 左树右预览 + OutlineNav | wt/file/filter 全部入 URL;worktree 分组折叠逻辑保留;预览器(Md/Image/Code/Unsupported)套 kit |
| **apply** | PageHeader(change 选择器)+ 任务勾选树 + 进度条 | change 参数入 URL;空态(无 change)走 EmptyState |
| **design** | PageHeader + 资产类型分组侧栏 + 预览区 | 多文件夹配置迁 manifest.config 单源;PageViewer/TokenViewer 拆独立文件 |
| **just** | PageHeader + **活跃任务侧栏** + LogViewer 主区 | 多任务并发:侧栏列出运行中任务,点开切换日志;server 端 JustRunner 并发能力需先核实(见风险) |
| **apply-batch** | PageHeader(全局进度 + 暂停/恢复)+ 依赖图/确认/进度三视图 + 日志尾 | 十条路由迁 SDK route/guardedRoute 补鉴权;2s 轮询切 `plugin:apply-batch:state` SSE;server store import 改 import type |

## URL 参数契约(foundation 契约表的插件部分)

| 参数 | 插件 | 说明 |
|---|---|---|
| `wt` `file` `filter` | view | worktree 绝对路径 / 文件相对路径 / 过滤词 |
| `change` | apply | change 名 |
| `view` `sel` | apply-batch | graph/approval/checkpoint / 选中 change 名 |
| `recipe` `task` | just | 选中 recipe / 活跃任务 id |
| `type` `asset` `folder` | design | 资产类型 / 选中资产 / 当前文件夹 |
| `card` | stats | 钻取来源(worktree/dirty),view 侧读取后高亮 |

每个插件的 ParamSchema 在 manifest.ts 声明,与上表一一对应。

## Server 侧迁移要点

- 每插件 `index.ts` → `definePlugin({ manifest, setup })`,manifest 从新 `manifest.ts` import。
- stats:删 `(ctx as any)` 与双层 inject;execFile git 调用收进 setup。
- apply-batch:十条路由改 SDK 助手;写操作(approve/pause/resume/retry/adjust/reset)全部 guardedRoute;store 变更处 `ctx.broadcast('state')` 推送。
- just:先核实 JustRunner 是否支持并发;若单 runner,server 侧改为 runner 池(Map<taskId, proc>)+ `plugin:just:log` 事件按 taskId 携带载荷。
- view/apply/design:路由薄,主要是迁 SDK 形态 + manifest 单源。

## 前端迁移要点

- 每插件 `web.tsx` → `defineWebPlugin({ manifest, workspace: lazy(() => import('./Workspace.js')), sidebar?, params })`;命名 re-export 全删。
- 页面顶层 `<PluginPage manifest={manifest}>`,内容区分 Sidebar(可选)+ Content 两栏。
- 数据获取统一 usePluginData:stats(`/__stats/data`)、apply(`/__apply`)、apply-batch(`/__apply-batch` + subscribe state)、design(`/__design/assets`)、view(`/__files?wt=` + `/__worktrees`)、just(LogViewer 保留自带 SSE,外层 recipes 用 usePluginData)。
- foundation 的兼容分支在本 change 最后一个任务删除。

## 实施步骤

1. stats(最简,验证 SDK 全链路)→ 2. view(最复杂交互,树+预览+URL)→ 3. apply → 4. design → 5. just(含 server 并发核实/改造)→ 6. apply-batch(路由收拢+SSE)→ 7. 删兼容分支 + 全量走查。

## 风险与 Trade-off

- **just server 并发能力未知**:实施第一步先核实;若单 runner,server 改造约 +0.5d,UI 设计不受影响(侧栏模型已按多任务设计)。
- **view 的 URL 化改动面最大**(树选中/过滤/worktree 全入 URL):保持「params 只重渲染消费方」,树滚动位置用 ref 保持,不做本地状态迁移。
- **apply-batch SSE 化**:store 变更 broadcast 粒度过粗会造成消息风暴——按 change 级别聚合,500ms 节流。
- **六页一起重写**无中间可用要求(用户拍板一次性),tasks 顺序即回退点。

## 测试策略

1. **单元(vitest)**:
   - 各插件 manifest.ts:字段完整、params schema 与契约表一致(参数表驱动测试,一例断言六插件)。
   - stats 钻取:navigate 调用断言(p:view / card 参数)。
   - view:URL→树选中反解、filter 匹配。
   - apply-batch:guardedRoute 403(无 token 的 approve/pause/resume/retry)、SSE 节流(500ms 窗口合并)。
   - just:多任务日志按 taskId 隔离。
2. **集成(playwright 手工清单)**:
   - 深链接:`/?p=view&wt=…&file=…` 刷新直达;`/?p=apply-batch&view=graph` 直开。
   - stats→view 钻取、dirty 高亮。
   - just 并发 2 recipe:侧栏双条目、日志独立。
   - apply-batch:store 变更 <1s UI 更新、无轮询请求、未带 token POST 403。
3. **边界**:worktree 为空/路径不存在时的空态;change 不存在;recipe 无 justfile。
4. **测试数据**:playground 项目 + ext-plugins demo;apply-batch 用 .zapply/batch-state.json 手工构造 running/failed 样例。
