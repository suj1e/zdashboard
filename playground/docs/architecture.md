# 架构说明

## 系统概览

zdashboard 是一个面向 ZCode skill 生态的通用 dashboard 平台，采用三层架构：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Gateway   │────▶│   Service   │────▶│ Repository  │
│  路由/鉴权  │     │  业务编排    │     │  数据访问    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 核心模块

### 1. Core（核心层）

提供 HTTP server、SSE、文件树、插件清单等基础能力，不包含任何业务逻辑。

- **server.ts**: HTTP server + route/SSE 注册表
- **reload.ts**: fs.watch → SSE broadcast
- **tree.ts**: /__files 文件树生成
- **manifest.ts**: /__plugins 插件清单

### 2. Plugins（插件层）

每个插件自包含前后端实现：

```
src/plugins/<mode>/
├── index.ts    ← 后端：注册 /__<mode>* 路由
├── web.tsx     ← 前端 manifest
└── Workspace.tsx / Viewer.tsx ← 前端组件
```

内置插件：
- **stats**: 项目文件统计
- **just**: Just Runner 任务执行与日志
- **bugs**: 禅道 Bugs 只读列表
- **review**: 文档评审状态流转
- **apply**: OpenSpec change 执行进度
- **design**: 设计资产分类浏览
- **view**: 项目浏览（文件预览）

### 3. Web（前端层）

SPA 前端，基于 Vite + React + Tailwind CSS：

- **App.tsx**: Shell：Topbar + IconRail + Workspace + StatusBar
- **layout/**: IconRail、StatusBar
- **home/**: HomeGrid 插件卡片
- **components/**: shared UI
- **viewers/**: Markdown/Image/Code/Unsupported 预览器
- **hooks/**: useSSE

## 数据流

```
前端 hash 变更 → App.tsx 切换 mode
    ↓
加载 plugin manifest → 渲染对应 Workspace
    ↓
Workspace fetch /__<mode>* 获取数据
    ↓
后端 plugin index.ts 处理请求，返回 JSON
```

## 插件生命周期

```
1. core/server.ts 扫描 plugins/ 目录
2. 加载每个 plugin 的 index.ts
3. 调用 apply(ctx, config) 注册路由
4. 前端加载 web.tsx manifest
5. 用户点击 IconRail → 渲染 Workspace
```

## 技术栈

- **运行时**: Node.js 20+，ESM
- **核心框架**: Cordis 4.0.0-rc.8
- **前端**: React 18 + Vite 5 + Tailwind 3
- **组件库**: Radix UI
- **HTTP**: Node http 模块
- **构建**: tsup（CLI） + Vite（SPA）

## 设计原则

1. **核心不动**: src/core/ 提供基础能力，不写业务逻辑
2. **插件自包含**: 每个 mode 在 src/plugins/<mode>/ 内完成前后端
3. **SPA 首页**: GET / 直接返回 index.html，前端 hash 驱动 mode 切换
