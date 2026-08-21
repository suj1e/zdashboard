# zdashboard

ZCode skill 的通用 dashboard 平台。核心不动，skill 自带 viewer，未来 N 个 dashboard 自然接入。

## 架构 (v2.0)

```
zdashboard/                    ← 一个核心包，永远不写业务逻辑
├── src/
│   ├── core/
│   │   ├── server.ts           ← HTTP server + route/SSE 注册表
│   │   ├── reload.ts           ← fs.watch → SSE broadcast
│   │   ├── tree.ts             ← /__files 文件树
│   │   └── manifest.ts         ← /__plugins 插件清单
│   ├── plugins/                ← 内置 plugins（随核心发版）
│   │   ├── just/               ← Just Runner 任务执行
│   │   ├── bugs/               ← 禅道 Bugs 只读列表
│   │   ├── review/             ← 文档评审状态流转
│   │   ├── apply/              ← OpenSpec change 执行进度
│   │   ├── design/             ← 设计资产分类浏览
│   │   └── view/               ← 项目浏览（文件预览）
│   ├── web/                    ← SPA 前端（Vite + React）
│   │   ├── App.tsx             ← Shell：Topbar + IconRail + Workspace + StatusBar
│   │   ├── layout/             ← IconRail、StatusBar
│   │   ├── home/               ← HomeGrid 插件卡片
│   │   ├── components/         ← shared UI（button、card、tooltip...）
│   │   ├── viewers/            ← Markdown/Image/Code/Unsupported 预览器
│   │   └── hooks/              ← useSSE
│   └── server/                 ← 后端 helpers（detect、scan、just-runner...）
├── package.json
└── README.md
```

## 设计原则

1. **核心不动**：`src/core/` 提供 HTTP server、SSE、文件树、插件清单，不写任何业务逻辑
2. **插件自包含**：每个 mode 在 `src/plugins/<mode>/` 内完成前后端（`index.ts` + `web.tsx` + `Workspace.tsx`）
3. **Cordis 生命周期**：用 `ctx.effect(() => () => dispose())` 管理清理，`ctx.server.route/sse` 注册路由
4. **SPA 首页**：`GET /` 直接返回 `index.html`，前端 hash 驱动 mode 切换（`#<mode>`）

## Plugin 约定

每个内置 plugin 提供：

```
src/plugins/<mode>/
├── index.ts       ← 后端：注册 /__<mode>* 路由
├── web.tsx        ← 前端 manifest（mode、label、icon、Workspace）
└── Workspace.tsx  ← 前端页面组件
```

```ts
// src/plugins/<mode>/web.tsx
import { lazy } from 'react';
import Workspace from './Workspace.js';

export default {
  mode: '<mode>',
  label: '显示名',
  icon: '🎯',
  description: '简短描述',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;
```

```ts
// src/plugins/<mode>/index.ts
export default {
  inject: ['server'] as const,
  apply(ctx: Context, config: { root: string }) {
    const server = (ctx as any).server;
    if (!server?.route) return;

    server.route('/__<mode>', async (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ /* ... */ }));
    });
  },
};
```

外部 plugin 放在 `--plugins <dir>` 下，结构同上，核心启动时自动扫描 `index.{ts,js,mjs}` 加载。

### 外部插件编写指南

外部插件允许自带静态 viewer 页面，通过 iframe 嵌入 dashboard。

**目录结构**

```
my-skill/
├── index.ts          ← 必填：cordis 插件定义
└── web/              ← 可选：静态 viewer 目录
    ├── index.html
    └── assets/...
```

**index.ts 约定**

```ts
import type { Context } from 'cordis';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const server = (ctx as any).server;
    const dashboard = (ctx as any).dashboard;
    if (!server?.route || !dashboard?.register) return;

    // 注册后端 API
    server.route('/__my-api', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ ok: true }));
    });

    // 注册 manifest（mode === 目录名时，若有 web/index.html 会自动填充 viewerUrl）
    dashboard.register({
      mode: 'my-skill',   // 必须与目录名一致才能自动填充 viewerUrl
      label: 'My Skill',
      icon: '🧩',
      description: '描述',
    });
  },
};
```

**web/ 约定**

- `web/index.html` 必须存在才会被自动服务
- 自动挂载在 `/__plugin/<目录名>/`，例如目录 `my-skill` 对应 `/__plugin/my-skill/`
- 页面内可通过相对路径引用同目录资源（js/css/图片）
- 页面内可调用插件注册的 API（如 `/__my-api`），与 dashboard 同源

**viewerUrl 覆盖**

如果需要在 manifest 中显式指定 viewerUrl，可直接写：

```ts
dashboard.register({
  mode: 'my-skill',
  label: 'My Skill',
  icon: '🧩',
  description: '描述',
  viewerUrl: '/custom-path/',
});
```

显式声明的 `viewerUrl` 优先于自动填充值。

**热刷新**

外部 viewer 的 HTML 文件会自动注入 reload 脚本（与 dashboard SPA 一致），修改 `web/index.html` 后浏览器会自动刷新。

**沙箱说明**

前端以 iframe 渲染 viewer，sandbox 属性设置为：

```
allow-scripts allow-same-origin allow-forms allow-popups
```

保留同源能力（可访问 dashboard 的 `/__*` API），同时禁止弹出窗口等潜在风险行为。

**无 web 目录的插件**

若插件目录没有 `web/index.html`，前端仍会显示插件卡片，但进入时展示占位页（不报错）。

## CLI 用法

```bash
# 基本用法
pnpm build
node dist/cli.js --dir <项目根> --port 4190

# 打开浏览器
node dist/cli.js --dir <项目根> --port 4190 --open

# 启动后直达某个 mode（拼 #<mode>）
node dist/cli.js --dir <项目根> --port 4190 --page design

# 加载外部 plugins
node dist/cli.js --dir <项目根> --port 4190 --plugins ./my-plugins
```

### 环境变量

- `PORT`：默认 4190（未被 `--port` 覆盖时）

### 内置路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/` | GET | SPA 首页 |
| `/__config` | GET | `{ stopToken, version, root }` |
| `/__stop` | POST | `x-stop-token` 鉴权，干净退出 |
| `/__plugins` | GET | 内置 + 外部插件清单 |
| `/__files` | GET | 文件树（openspec/docs 过滤） |
| `/__reload` | SSE | `reload` + `files` 事件 |
| `/__just/recipes` | GET | just 任务列表 |
| `/__just/logs` | SSE | just 实时日志 |
| `/__just/{start,stop,restart}` | POST | just 任务控制 |
| `/__bugs` | GET | 禅道 bug 列表 |
| `/__review` | GET | 评审项列表 |
| `/__review/item` | POST | 更新评审项 |
| `/__review/status` | POST | 更新评审状态 |
| `/__docs` | GET | 项目文档列表 |
| `/__apply` | GET | OpenSpec changes 列表 |
| `/__apply/change` | GET | `?name=<change>` 详情 |
| `/__design/assets` | GET | 设计资产扫描 |

## 前端路由

前端用 hash 驱动 mode：

- `/#<mode>` 激活对应 plugin Workspace
- `/#` 或空 hash 回到 HomeGrid
- IconRail 点击自动写 hash
- 浏览器前进/后退由 `hashchange` 事件处理

## 技术栈

- **运行时**：Node.js 20+，ESM，`node:` 前缀
- **核心框架**：Cordis 4.0.0-rc.8（Context + Service + inject）
- **前端**：React 18 + Vite 5 + Tailwind 3
- **组件库**：Radix UI（tooltip、separator、scroll-area、slot）
- **HTTP**：Node `http` 模块（无 express 依赖）
- **构建**：tsup（CLI） + Vite（SPA）
- **包管理**：pnpm

## 迁移状态

- [x] zview-dashboard → zdashboard（v1.0.0）
- [x] zreview-dashboard → zdashboard plugin（v1.2.0）
- [x] zdesign-dashboard → zdashboard plugin（v1.2.0）
- [x] zapply execution progress → zdashboard plugin（v1.3.3）
- [x] zskills skill SKILL.md 统一调用 zdashboard
- [x] v2.0 cordis 重写：core 不动，插件自包含，SPA 首页
