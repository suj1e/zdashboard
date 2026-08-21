# Design: 外部插件 Workspace 动态加载（iframe）

基于分支 `2026-08-21-cordis-rewrite`（已归档的 cordis 重写）继续开发，新分支 `2026-08-21-external-workspace`。

## 目标契约（外部插件作者视角）

```
ext-plugins/my-skill/
├── index.ts          ← cordis 插件：export default { inject:['server','dashboard'], apply(ctx, config) }
│                        apply 里：ctx.dashboard.register({ mode:'my-skill', label:'…', icon:'…', description:'…' })
│                        有后端需求时：ctx.server.route('/__my-api', ...)
└── web/              ← 可选：静态 viewer
    ├── index.html
    └── assets…       ← 相对路径引用即可
```

启动：`zdashboard --dir <root> --plugins ./ext-plugins`

行为：
- `web/` 目录自动服务在 `/__plugin/my-skill/`（前缀 = `/__plugin/<目录名>/`）
- manifest.mode === 目录名 且未显式给 viewerUrl → 自动填充 `viewerUrl: '/__plugin/my-skill/'`
- manifest 显式 `viewerUrl`（任意同源路径，包括指向自己 apiRoutes 的页面）→ 优先
- 前端 Workspace = `<iframe src={viewerUrl}>`；无 viewerUrl → 占位页（现状）

## 实现点

### 1. `src/core/server.ts` — ServerService.static()

```ts
static(prefix: string, dir: string): void   // effect 化注销
```

- 分发顺序变为：**精确路由 → `/__plugin/` 前缀静态 → SPA 资产 → 用户资产兜底**（前缀静态必须在 SPA/用户资产之前，避免被兜底吞掉）
- 前缀匹配：url 以 prefix 开头，剩余部分拼到 dir；resolve 后必须仍在 dir 内（复用现有路径穿越防护写法）；目录请求（`/` 结尾或无扩展名命中目录）落 `index.html`
- HTML 文件走 `serveFile(fp, res, true)`（注入 INJECT reload 脚本，外部页面获得热刷新）；其他 MIME 复用现有表
- 多个 static 前缀可并存（Map<string, dir>）

### 2. `src/core/manifest.ts` — viewerUrl

```ts
export interface PluginManifest {
  mode: string; label: string; icon: string;
  description?: string;
  viewerUrl?: string;      // 新增：同源 URL，前端 iframe 渲染
  external?: boolean;
}
```

- `DashboardService` 增加 `get(mode): PluginManifest | undefined`
- `register()` 支持覆盖注册（Map.set 语义，天然支持）；加载器自动填充走「read-modify-register」

### 3. `src/cli.ts` — loadExternal 增强

每个插件目录挂载成功后：

```
webDir = <dir>/web 存在且含 index.html？
  → ctx.server.static(`/__plugin/<dirname>/`, webDir)
  → m = ctx.dashboard.get(dirname)（mode === 目录名）存在且 !m.viewerUrl
      → ctx.dashboard.register({ ...m, viewerUrl: `/__plugin/<dirname>/` })
```

注意：插件 apply 可能因 inject 异步激活，`ctx.dashboard.get` 需在**挂载完成之后**调用——`ctx.plugin()` 返回 awaitable fiber，对外部插件先 `await fiber`（rc.8 fiber 是 PromiseLike，可直接 await）再探测；await 失败（插件抛错）按现有逻辑只告警不崩。

### 4. 前端

- `src/web/lib/plugins.ts`：外部 manifest 带 viewerUrl → 构造 `Workspace = ExternalWorkspace`（普通组件，非 lazy），props 经闭包传 viewerUrl
- 新增 `src/web/components/ExternalWorkspace.tsx`：
  ```tsx
  <iframe src={viewerUrl} title={label} className="w-full h-full border-0 bg-background"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
  ```
  同源 sandbox 组合保留 /__ API 访问能力
- HomeGrid 卡片：外部插件已有 external 徽标逻辑则保留；无则加个小「外部」标记
- 无 viewerUrl 的外部插件维持现有占位 Workspace

### 5. Fixture（冒烟用）

`test-server/ext-plugins/demo/`：
- `index.ts`：inject ['server','dashboard']，register({mode:'demo', label:'演示插件', icon:'🧩', description:'外部 viewer 演示'})，另注册 `ctx.server.route('/__demo/api', …)` 返回 `{"ok":true}`（演示外部页可调 API）
- `web/index.html`：极简页面，`fetch('/__demo/api')` 把结果显示出来 + 一个标题「External Demo」（验证 iframe + API 联通）

### 6. README

新增「外部插件编写指南」小节：目录结构、web/ 约定、viewerUrl 覆写、注入的热刷新说明、sandbox 说明。

## 明确不做

- 运行时 ESM/微前端加载外部 React 组件（评估后否决，隔离差、依赖共享复杂）
- 外部 viewer 的 deep-link（#hash 只切到插件级，不进 iframe 内部路由）
- external plugin 热重载（重启 zdashboard 生效，与现状一致）

## 验证

1. `pnpm build` + vitest 全绿
2. 冒烟（`node dist/cli.js --dir test-server --plugins test-server/ext-plugins --port 4296`）：
   - `/__plugins` 含 demo 条目且 `viewerUrl === '/__plugin/demo/'`
   - `GET /__plugin/demo/` 200 且为注入后的 HTML；`GET /__plugin/demo/../..%2Fcli.js` 之类的穿越被 403/404 挡住
   - `/__demo/api` 200 `{"ok":true}`
   - 浏览器：`#demo` 直达 → iframe 渲染 + API 数据显示；改 web/index.html → SSE 触发 iframe 内刷新
   - 无 web 目录的插件 → 占位页不报错（补一个 `ext-plugins/bare/` 只有 index.ts 的 fixture）
3. `POST /__stop` 干净退出
