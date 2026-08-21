# Design: zdashboard 2.0 — 基于 cordis 的插件化重写

## 技术选型与版本

- **cordis `4.0.0-rc.8`**（已安装，package.json 锁精确版本，不带 `^`）。已验证：ESM import 正常、`new Context()` 直接用、`ctx.plugin(fn)` 挂载即激活、`ctx.effect(fn)` 返回清理、`fiber.dispose()` 逆序回收。**rc.8 根 Context 没有 `ctx.start()`**，不要调用
- **Service 类**：`class X extends Service { constructor(ctx) { super(ctx, 'name') } }`，挂载后 `ctx.name` 可访问；通过 `declare module 'cordis' { interface Context { name: X } }` 补类型
- **插件形态**：统一函数插件 `export function apply(ctx: Context) { ctx.server.route(...) }`；路由/子进程/watcher 全部经 `ctx.effect()` 或服务内 effect 注册，卸载自动回收
- 后续 vendor cordis（deepseek-harness 路线）不在本次范围

## 目标结构

```
src/
├── cli.ts                        ← 入口：参数解析 → new Context() → 挂 core + 内置插件 (+外部插件) → 常驻
├── core/
│   ├── server.ts                 ← ServerService（ctx.server）
│   ├── reload.ts                 ← ReloadService（ctx.reload）
│   ├── tree.ts                   ← /__files（scanTree + detect）
│   └── manifest.ts               ← DashboardService（ctx.dashboard）+ GET /__plugins
├── plugins/
│   ├── just/index.ts             ← /__just/*（JustRunner effect 化）
│   ├── bugs/index.ts             ← /__bugs
│   ├── review/index.ts           ← /__review /__review/item /__review/status /__docs
│   ├── apply/index.ts            ← /__apply /__apply/change
│   ├── design/index.ts           ← /__design/assets
│   ├── view/index.ts             ← 后端无路由（可空 apply 或仅日志）
│   ├── just/web.tsx              ← 前端契约：日志工作区
│   ├── view/web.tsx              ← 前端契约：文件树工作区（原共享 FileTree 下沉为此插件私有）
│   ├── bugs/web.tsx
│   ├── review/web.tsx            ← 引用现有 viewers/ReviewViewer
│   ├── design/web.tsx            ← 引用现有 DesignViewer
│   └── apply/web.tsx
└── web/                          ← 前端骨架
    ├── App.tsx                   ← Shell：Topbar + IconRail + Workspace + StatusBar
    ├── layout/IconRail.tsx
    ├── layout/StatusBar.tsx
    ├── home/HomeGrid.tsx         ← 插件卡片网格 + 探测信息
    └── lib/plugins.ts            ← import.meta.glob('../plugins/*/web.tsx') + /__plugins 合并
```

**删除**：`src/server/index.ts`、`src/server/plugins.ts`。
**原样复用**（逻辑模块，只许改 import 路径相关的最小改动）：`src/server/just-runner.ts`、`src/server/bugs.ts`、`src/server/review-store.ts`、`src/server/design-assets.ts`、`src/server/spec-scan.ts`、`src/server/detect.ts`、`src/server/api/fetch.ts`、`src/server/errors.ts`。

## core 四个服务的设计

### 1. ServerService（`src/core/server.ts`，服务名 `server`）

```ts
interface RouteHandler { (req: http.IncomingMessage, res: http.ServerResponse): void }

class ServerService extends Service {
  constructor(ctx, opts: { root: string; appDir: string; port: number; open: boolean })
  route(path: string, handler: RouteHandler): void   // 注册进 Map，ctx.effect 自动注销
  sse(path: string, onConnect: (res) => () => void): void  // SSE 端点：onConnect 返回清理函数
  broadcast?  // 不放这里，reload 服务自己管自己的连接池
  stopToken: string                                    // crypto.randomBytes(12) hex
}
```

- `http.createServer(handler)`，请求分发顺序：**精确路由表（route/sse 注册的）→ `/_app` 前缀（SPA 资产，含 `/`、`/assets/`）→ 用户资产兜底**（root 内文件，html 注入 reload script，路径穿越防护保留现有写法）
- 端口占用递增重试（保留现有 EADDRINUSE 逻辑）；监听成功后打印 banner 并按需 `open`
- stop 流程：`POST /__stop`（校验 `x-stop-token`）→ `res.end('{"ok":true}')` → 延迟 50ms → `ctx.dispose()` 根 fiber（触发全部插件逆序清理，JustRunner 子进程被杀）→ `server.close()` → `process.exit(0)`。`GET /__config` 返回 `{ stopToken, version }`
- MIME 表、INJECT 脚本（SSE reload + target=_self 改写）从旧 server/index.ts 原样搬

### 2. ReloadService（`src/core/reload.ts`，服务名 `reload`）

- 自己维护 SSE 客户端 Set，经 `ctx.server.sse('/__reload', ...)` 注册连接
- `fs.watch(root, { recursive: true })` 包在 `ctx.effect` 里（清理时 close watcher），150ms 防抖后 `broadcast('reload')` + `broadcast('files')`
- `inject: ['server']`（作为插件挂载时声明依赖，确保 server 先就绪）

### 3. tree（`src/core/tree.ts`）

- 插件（函数插件，inject server）：`ctx.server.route('/__files', ...)` 返回 `{ tree, ...detect }`（scanTree + detect 结果，行为与现状一致，**不再有 design 分支**）
- detect 里的 `hasJust` 探测保留（just 插件与首页卡片都用）

### 4. DashboardService（`src/core/manifest.ts`，服务名 `dashboard`）

```ts
interface PluginManifest { mode: string; label: string; icon: string; description?: string; external?: boolean }
class DashboardService extends Service {
  register(manifest: PluginManifest): void   // effect 化：插件卸载自动从清单移除
  list(): PluginManifest[]
}
```

- `GET /__plugins` 返回 `{ plugins: list() }`。内置插件的 manifest 由**前端 web.tsx** 为准（有真实 Workspace）；外部插件经 dashboard.register 上报，前端合并展示（占位工作区）

## 业务插件（后端 index.ts，全部 `export function apply(ctx)`）

| 插件 | 路由 | 说明 |
|------|------|------|
| just | `GET /__just/recipes`、`GET /__just/logs`(SSE)、`POST /__just/{start,stop,restart}` | `new JustRunner(root)`；`ctx.effect(() => () => runner.stop())` 保证 dispose 杀子进程；`/__just/logs` 用 `ctx.server.sse`，连接清理返回 runner.unsubscribe。start/restart 校验 recipe 名（保留现逻辑），POST 鉴权 stopToken |
| bugs | `GET /__bugs` | 直接调 `fetchBugs(root)`，行为不变 |
| review | `GET /__review`、`POST /__review/item`、`POST /__review/status`、`GET /__docs` | ReviewStore 逻辑不变；写接口校验 stopToken；注意 `reviewStore.write` 会触发 reload 广播 → 用 ctx.reload.broadcast('files') 替代原 onChange（可选，若 wired 复杂就保留静默写，文件 watch 会兜底触发） |
| apply | `GET /__apply`、`GET /__apply/change?name=` | scanApplyChanges/readApplyChange 从旧 server/index.ts 抽出为 `src/plugins/apply/scan.ts` |
| design | `GET /__design/assets` | scanAssets 原样；**去掉 `/__files` 的 `MODE==='design'` 分支** |
| view | 无路由 | `export function apply(ctx) { ctx.logger.info('view plugin loaded (web only)') }` |

所有插件挂载顺序在 cli.ts：core（server → reload → tree → manifest）→ 业务插件。cordis inject 保证依赖顺序，无需手工编排。

## 前端设计

### 插件契约（`web.tsx`）

```ts
// src/plugins/<name>/web.tsx
import { lazy } from 'react';
export default {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  description: 'openspec / docs / 文档预览',
  Workspace: lazy(() => import('./Workspace')),   // 完整工作区组件，default export
} satisfies WebPlugin;
```

`src/web/lib/plugins.ts`：
```ts
const modules = import.meta.glob('../../plugins/*/web.tsx');
// 载入全部 → 排序（固定顺序表 view/bugs/review/design/apply/just，未知的排后面按字母序）
// fetch('/__plugins') 合并外部插件（Workspace 用占位组件）
```

### 布局（图标导航栏 + 工作区）

```
┌──────────────────────────────────────┐
│ Topbar: ☰? 不需要 · zdashboard · 🌙 ⏹ │  ← 保留现有 Topbar（去掉树折叠钮，树归插件管）
├────┬─────────────────────────────────┤
│ 🏠 │                                 │
│ 👁️ │     当前插件的 Workspace         │  ← 插件全权拥有：自带侧栏/内容
│ 🎯 │     （view=文件树+预览            │
│ ✅ │       design=资产树+viewport     │
│ 🎨 │       bugs=表格 …）              │
│ ⚙️ │                                 │
│ 📜 │                                 │
├────┴─────────────────────────────────┤
│ StatusBar: localhost:4190 · ~/proj ·●│  ← 端口(来自location)/项目路径(新 /__config 返回)/SSE状态
└──────────────────────────────────────┘
```

- **IconRail**：48px 宽，首页(🏠) + 各插件 icon（emoji 直接渲染），active 高亮（左边框或背景），hover tooltip 显示 label（用现有 ui/tooltip），点击切换
- **HomeGrid**：卡片网格用 shadcn/ui Card 组件（**补 `src/web/components/ui/card.tsx`**，标准 shadcn 复制件，含 Radix Slot/cva 写法与项目现有 ui/ 组件一致；不手搓 div 卡片），每卡 icon + label + description，顶部显示探测信息行（openspec/docs/just/bugs 有无，数据来自 /__files payload）；点击卡片进插件
- **StatusBar**：`location.host` + 项目路径 + SSE 连接状态点（useSSE 的状态从 Topbar 挪到这里）；分隔用现有 ui/separator
- **UI 组件纪律**：新布局全部复用/补充 shadcn/ui 约定（现有 button/tooltip/separator/scroll-area + 新增 card），风格与令牌（hsl(var(--...))）一致
- **hash 直达**：`location.hash` 变化驱动选中（`#view`→view 插件，空/`#home`→首页），切换时写 hash；popstate/hashchange 监听
- **view 工作区**：现有 FileTree 组件（含过滤框）+ MdViewer/ImageViewer/CodeViewer/UnsupportedViewer 组合，整体作为 view 的 Workspace；FileTree 里的"服务日志"入口和插件列表入口删掉（日志已是独立工作区，插件切换归 IconRail）
- **design 工作区**：现有 DesignViewer 原样，仅 `/__files` 改拉 `/__design/assets`
- **just 工作区**：现有 LogViewer 原样作为 Workspace，顶部加 recipe 选择（现有组件已有则不动）
- bugs/review/apply 工作区：现有 Viewer 组件原样搬进各自 Workspace

### 现有组件处置

- `src/web/components/FileTree.tsx` → 移到 `src/plugins/view/`（或保持位置仅被 view 引用，倾向移动以体现"插件自治"）
- `src/web/viewers/*` → MdViewer/ImageViewer/CodeViewer/UnsupportedViewer 被 view 引用（可留原地）；LogViewer 被 just 引用
- `src/plugins/*/index.tsx`（旧前端 manifest）→ 全部删除，由 web.tsx 取代
- Topbar 的 treeOpen/onTreeToggle 删除（树折叠状态由各插件 Workspace 自管）

## CLI（`src/cli.ts`）

```
zdashboard --dir <root> --port <4190> --open --page <mode> --plugins <dir>
```

- `--page`：仅拼进 `--open` 打开的 URL（`http://localhost:PORT/#<page>`），不影响后端
- `--plugins`：外部插件目录，扫子目录 `index.{ts,js,mjs}`；TS 经 tsx 加载（`import { register } from 'tsx/esm/api'` 一次性注册后动态 import；tsx 加入 dependencies）；加载失败 logger.error 不崩溃
- 启动流程：parse args → `detect(root)` → `new Context()` → `ctx.plugin(ServerService, {root, appDir, port, open})` → reload/tree/manifest → 六个内置插件 → 外部插件 → 打印 banner（version/root/port/detect）
- 常驻靠 http server 事件循环，无需额外 keep-alive
- appDir 解析保持现状：`path.resolve(__dirname, 'web')`（tsup 打包后 dist/web，vite outDir 已是 dist/web）

## 构建与版本

- tsup 不变（bundle 含 cordis；若 bundle 失败 fallback：`external: ['cordis']`）
- package.json：version → `2.0.0`；dependencies 加 `tsx`；cordis 锁 `4.0.0-rc.8`（无前缀）
- vite proxy 增加 `/__design`、`/__plugins`（现有 /__files /__reload /__config /__stop /__just /__apply /__bugs /__review /__docs 保留）
- README 重写架构图与用法（--page 替代 --mode 的迁移说明）

## 明确不做

- 不 vendor cordis（后续单独 change）
- 外部插件的 React Workspace 动态加载（v1 外部插件只有后端路由 + 占位入口）
- cordis-plugin-hmr 热重载、cordis.yml 配置树（当前 CLI 参数足够）
- i18n 文案调整（en/zh-CN 现有键保留，新增文案直接加）

## 测试与验证

1. `pnpm build` 全绿；vitest 全绿（现有 Button/format 测试）
2. 冒烟（对 test-server 目录）：
   - `GET /__config` → `{ stopToken, version }`
   - `GET /__plugins` → 六个内置 manifest
   - `GET /__files` → tree + detect
   - `GET /__apply`、`GET /__design/assets` → 正常 JSON
   - `GET /__reload` SSE 连上后改文件 → 收到 reload/files 事件
   - `POST /__stop` → 进程退出、无残留 just 子进程
3. 浏览器：首页卡片 → 各工作区切换 → `#design` 直达 → view 文件预览
