# Proposal: 外部插件 Workspace 动态加载（iframe 方案）

## 需求复述

zdashboard 2.0 已完成 cordis 插件化，但外部插件（`--plugins` 目录）目前只有后端能力：能注册 API 路由、能在侧边栏显示图标，点进去却是**占位页**——因为外部插件的 React/HTML viewer 不在 zdashboard 的 vite 构建产物里，前端加载不到。这是插件化故事的最后一公里：zdashboard 的定位是"skill 自带 viewer"，zgoal/zview/zreview/zdesign 等 skill 想接自己的界面现在做不到。

## 要解决的问题

外部 skill 插件无法向前端贡献任何可视化界面，只能靠后端 API。

## 方案

**iframe 隔离方案**（已与用户对齐）：

1. `ServerService` 新增前缀静态服务 `static(prefix, dir)`：把外部插件目录下的 `web/` 子目录服务到 `/__plugin/<name>/`
2. `PluginManifest` 新增 `viewerUrl?: string` 字段；加载器约定：插件目录有 `web/index.html` 且 manifest.mode === 目录名时自动填充 `viewerUrl`
3. 前端：manifest 带 `viewerUrl` 的外部插件，Workspace 渲染 `<iframe src={viewerUrl}>`（同源，可访问 /__ API；HTML 注入 reload 脚本实现热刷新）；无 viewerUrl 保持占位

选 iframe 而非运行时 ESM 动态 import 的理由：样式/依赖完全隔离（不共享 React 实例，外部组件的 tailwind 类无需进主构建），实现成本最低、最不容易坏。

## 成功标准

1. 外部插件目录含 `web/index.html` 时：自动服务在 `/__plugin/<name>/`，前端 iframe 正常渲染，页面改动经 SSE 热刷新
2. manifest 显式声明 `viewerUrl` 时优先使用声明值
3. 无 web 目录的外部插件保持占位工作区，不报错
4. 路径穿越防护覆盖 `/__plugin/` 前缀
5. 附带一个可运行的外部插件 fixture（test-server）用于冒烟
6. `pnpm build` + vitest 全绿，README 增加外部插件作者指南
