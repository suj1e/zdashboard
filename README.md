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
export const apply = {
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
