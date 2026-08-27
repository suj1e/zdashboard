# 设计:插件平台地基(plugin-platform-foundation)

## 背景与目标

为插件体系重写提供全部公共设施。分层总览与决策上下文:

```
┌─ 壳层  App / IconRail / SidebarFrame / StatusBar   (本 change 现代化改造)
├─ 运行时  router(searchParams) + plugin registry + PluginPage 模板   ← 本 change
├─ 组件库  src/web/kit/   ← 本 change
├─ SDK    definePlugin(server) / defineWebPlugin(client) / shared   ← 本 change
├─ 插件   六个内置插件   (plugin-platform-plugins change 重写)
└─ 内核   cordis: ServerService / ReloadService / DashboardService   (保留不动)
```

已对齐决策:精装三段式骨架、URL 路由、统一 SDK、平台组件库、统一页面模板、沿用现有主题系统、一次性交付(本 change 为三 change 序列之首)。

## 现有系统分析

### 承重墙(必须兼容)

1. **mode 全局唯一 ID**:URL 参数、localStorage 键、外部插件目录名自动接线全押在它上面 → 保留。
2. **PluginManifest 形状 + `/__plugins` 契约**(core/manifest.ts):viewerUrl/external 自动补全是外部插件既有承诺 → 字段只增不改。
3. **cordis 服务骨架**:route/sse/static 注册口 + ctx.effect 卸载语义 → 保留,其上封装。
4. **web 入口约定**:`src/plugins/*/web.tsx` default export + import.meta.glob → 保留形状。
5. **`.zdev/dashboard.json` 双职责**:不动,避免迁移风险。
6. **既有 HTTP API 路径与响应形状**:保持(新增路由除外)。

### 痛点对照

| 痛点 | 本 change 消解手段 |
|---|---|
| 元数据双份 / schema 三处 | manifest 单一来源(shared.ts 常量,两端 import) |
| cordis 四种写法 | definePlugin 唯一姿势 |
| 25 处 writeHead 样板、鉴权不齐 | route()/guardedRoute() 助手 |
| hash+navToken 导航 | searchParams 路由 |
| 假 lazy 破坏分包 | defineWebPlugin 强制 lazy |
| 数据获取三范式 | usePluginData + 插件 SSE 频道 |
| 探测搭 /__files 便车 | 独立 /__detect |
| emoji 图标分裂 | IconRail/HomeGrid 接 useIcons |

## 方案设计

### 1. SDK(server 侧)`src/sdk/server.ts`

```ts
export function definePlugin(def: {
  manifest: PluginManifest;
  setup(ctx: PluginContext): void;
}): CordisPluginObject;                  // { inject, apply } cordis 形态

export interface PluginContext {
  mode: string;
  config<T>(): T;                        // manifest.config 默认值合并 .zdev 配置
  route(path: string, handler: RouteHandler): void;         // 自动 json 响应
  guardedRoute(path: string, handler: RouteHandler): void;  // 自动校验 x-stop-token
  sse(path: string, handler: SseHandler): void;
  static(prefix: string, dir: string): void;
  broadcast(event: string, data?: unknown): void;           // → plugin:<mode>:<event>
  onDispose(fn: () => void): void;
}
```

- SDK 内部自动 `dashboard.register(manifest)` 与 effect 清理;四种 cordis 姿势消亡。
- cli.ts 内置注册从手写循环改为 `BUILTIN_PLUGINS.map(p => ctx.plugin(p))`。
- core/server.ts 增加导出助手 `json(res, data)` / `guarded(req, res, token)`,供 SDK 与直接使用者复用;ServerService 本体不动。

### 2. SDK(client 侧)`src/sdk/client.tsx` + `src/sdk/shared.ts`

```ts
export function defineWebPlugin(def: {
  manifest: PluginManifest;              // 与 server import 同一份常量
  workspace: React.LazyExoticComponent;  // 强制 lazy(类型约束)
  sidebar?: React.LazyExoticComponent;
  params?: ParamSchema;                  // 本插件消费的 URL 参数声明
}): WebPlugin;
```

- 每插件新增 `manifest.ts` 导出 PluginManifest 常量(server definePlugin 与 client defineWebPlugin 同 import)。
- web.tsx 退化为 `export default defineWebPlugin({ manifest, workspace: lazy(...) })`;命名 re-export 与静态 import 禁止(类型层面 lazy 强制)。
- `web/lib/plugins.ts` 注册表改造:ORDER 数组 → manifest 可选 `order` 字段(缺省字母序);删除 bugs/review 残留项。

### 3. URL 路由 `src/web/router.ts`

URL 形态:`/?p=<mode>&<plugin params>`,如 `/?p=view&wt=/path&file=openspec/...&filter=auth`。

```ts
export function useRoute(): {
  plugin: string | null;
  params: URLSearchParams;
  navigate(patch: Record<string, string | null>, opts?: { replace?: boolean }): void;
}
```

- history.pushState + popstate;`navigate` merge params,null 删键。
- App 订阅 `route.plugin` 决定 HomeGrid 或插件页;params 变化只重渲染消费方(对比 navToken 整页 remount)。
- 删除:hash 路由、`zd-dashboard-nav` 监听、navTarget、navToken、Topbar 之外的 hashchange 逻辑。
- 兼容:首次进入若 URL 为 `#<mode>`(旧深链接),重定向为 `?p=<mode>`。

图示:[diagrams/routing-dataflow.html](diagrams/routing-dataflow.html)

### 4. kit 组件库 `src/web/kit/` + PluginPage 模板

| 组件 | 职责 |
|---|---|
| `PageHeader` | 图标 + 标题/面包屑 + 动作区 + 状态 chip |
| `Toolbar` | 搜索/筛选/批量动作排布 |
| `SectionCard` | 内容分组卡片 |
| `EmptyState` / `ErrorState` / `Skeleton` | 三态 |
| `Chip` / `IconButton` / `DataList` / `KeyValue` | 基础原子 |

- 全部接现有 CSS 变量 token(--background/--muted/--radius-* 等),三主题 + 明暗零改动适配;不引入新依赖,shadcn 基础件(button/card/badge/scroll-area/tooltip)保留为底层。
- `<PluginPage manifest>`:渲染 PageHeader + `<AsyncBoundary loading error empty>` 统一三态边界 + children;插件内容自由。
- IconRail/HomeGrid 的 emoji 改走 useIcons(平台维护 mode→icon 映射,manifest.icon 保留为 fallback)。

图示:[diagrams/plugin-page-template.html](diagrams/plugin-page-template.html)、总体分层 [diagrams/architecture.html](diagrams/architecture.html)

### 5. 数据层

```ts
// src/web/hooks/usePluginData.ts
export function usePluginData<T>(key: string, fetcher: () => Promise<T>,
  opts?: { subscribe?: string }): { data: T | null; error: string | null; reload(): void }
```

- 模块级缓存 + 同 key 去重 + `subscribe` 指定 SSE 事件名,到达即失效重取。
- ReloadService 扩展 `broadcastPlugin(mode, event)` → SSE 事件 `plugin:<mode>:<event>`;既有 reload/files/config 事件不变。
- HomeGrid 探测:`/__detect` 新路由(server/detect.ts 现有能力直接暴露,响应 `{ hasOpenspec, hasDocs, hasJust, hasJustbugs:false }` 形状,不含 bugs);`/__files` 响应中的 detect 字段保留一个版本期(兼容)后由清理 change 摘除。

### 6. 壳层改造范围

- App.tsx:接 useRoute;IconRail/SidebarFrame/StatusBar 结构保留,props 面收窄。
- IconRail:useIcons 渲染;SidebarFrame:无行为变化。
- HomeGrid:卡片数据来自 registry(manifest.order 排序),探测走 /__detect。
- **旧插件兼容**:现 6 个插件的旧 web.tsx(default export WebPlugin 形状)在注册表加适配分支继续可用,六插件实际迁移由 plugin-platform-plugins 完成;适配分支随该 change 收尾删除。

## 接口 / 数据契约

### URL 契约

| 参数 | 消费方 | 说明 |
|---|---|---|
| `p` | 平台 | 插件 mode;缺省 = 首页 |
| 其余 | 各插件 | 见 plugin-platform-plugins/design.md 参数表 |

### SSE 事件契约

- 既有:`reload`、`files`、`config` 不变。
- 新增:`plugin:<mode>:<event>`;SDK broadcast 发射,usePluginData subscribe 消费。

### SDK 签名

见第 1、2 节;SDK 不发包,内置插件直接 import,外部 TS 插件经 tsx/esm 可 import 宿主导出(loadExternal 已有 tsx register)。

## 实施步骤

1. core route 助手(json/guarded)+ `src/sdk/server.ts` + cli.ts 注册改造;vitest:register/403/json。
2. `src/web/router.ts` + App 接线 + 旧 hash 重定向;删 navToken/navTarget/zd-dashboard-nav;vitest:navigate merge/删键/popstate。
3. kit 十组件 + PluginPage + AsyncBoundary;vitest:三态边界与快照。
4. usePluginData + ReloadService 插件频道 + `/__detect`;vitest:缓存/去重/失效。
5. 注册表改造(manifest.order、兼容分支)+ IconRail/HomeGrid useIcons + /__detect 接入。
6. build + 手工冒烟:六旧页面在新壳层可开、主题切换、?p= 直开/刷新/后退。

## 设计模式建议

- **插件模式 + Template Method**:definePlugin 固定 cordis 生命周期骨架,setup 填肉;插件层全量迁移、内核零侵入。
- **SSOT**:manifest 单文件声明两端 import,编译期消灭漂移。
- **适配器**:definePlugin 返回 cordis PluginObject,未来换内核只改 SDK 一层。
- **发布/订阅**:SSE 插件频道 + usePluginData 失效,替代轮询与手动传播。

## 性能优化点

- **真分包**:lazy 强制 + 假静态 import 禁止,六插件按 mode 独立 chunk。
- **重挂载消除**:URL params 只重渲染消费方,树滚动位置等状态保留。
- **首屏减负**:HomeGrid 探测从 /__files 全量树改为 /__detect 轻接口。

## 风险与 Trade-off

- **中间态**:本 change 合入后插件仍是旧页面(套新壳)——这是三 change 序列的设计使然,非缺陷;最终态由后两个 change 完成。
- **兼容分支技术债**:旧 web.tsx 适配分支为过渡产物,由 plugin-platform-plugins 收尾删除;若该 change 延期,分支存活期 = 延期时长(可接受,代码隔离在一个文件)。
- **URL params 各插件不一致**:ParamSchema + plugins change 的参数契约表约束。
- **开放问题**:kit 是否需要 DataGrid?本期无表格需求,不做,留扩展位。

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 总体分层架构 | diagrams/architecture.html | 六层依赖栈与各层交付 change 归属 |
| 路由数据流 | diagrams/routing-dataflow.html | URL params → router → App → PluginPage,popstate 回流,旧机制删除标记 |
| 页面模板 | diagrams/plugin-page-template.html | PluginPage / PageHeader / AsyncBoundary / Content 包容结构 |

## 测试策略

分层与目标:

1. **单元(vitest,覆盖率为主要抓手)**:
   - sdk/server:definePlugin 注册 manifest 到 /__plugins、route() 自动 json 包装(Content-Type/状态码)、guardedRoute() 无/错 token 返回 403、onDispose 触发清理。
   - sdk/client:defineWebPlugin 拒绝非 lazy workspace(类型测试)、manifest 字段透传。
   - router:navigate merge、null 删键、replace 语义、popstate 同步、`#mode` 旧链接重定向。
   - usePluginData:缓存命中、同 key 去重、subscribe 事件失效重取、error 态。
   - kit:三态边界(loading/error/empty)渲染分支 + 关键组件快照(PageHeader/Toolbar/EmptyState)。
   - 覆盖率目标:sdk/ 与 router/ 行覆盖 ≥85%,kit ≥70%。
2. **集成(手工冒烟清单)**:`?p=` 直开六旧插件、刷新保持、后退回首页、主题三套×明暗切换、/__detect curl 校验、SSE plugin 事件(用 just 的日志触发)。
3. **边界/异常**:非法 `?p=xxx` 回首页;URL 带 NaN/超长参数不崩;SSE 断线重连后 usePluginData 恢复。
4. **测试数据**:复用 playground 项目;SSE 用 just start/stop 制造事件。
