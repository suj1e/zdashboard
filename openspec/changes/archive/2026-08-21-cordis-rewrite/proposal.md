# Proposal: zdashboard 2.0 — 基于 cordis 的插件化重写

## 需求复述

zdashboard 当前是"伪插件化"：`DashboardPlugin` 接口存在，但 HTTP 路由、SSE、文件树、just runner 等核心能力全部硬编码在 `src/server/index.ts`（348 行单体），前端 App.tsx 用硬编码 switch 发现插件，`--mode` CLI 参数控制前后端行为。随着 zgoal/zview/zreview/zdesign/zapply 五个 skill 的 dashboard 全部接入，以及未来"很多好玩的东西"，自维护生命周期、副作用清理、插件依赖的代价会越来越高。

参考 deepseek-harness（基于 cordis 的 agent runtime，"Everything is a Plugin"）验证过的模式，将 zdashboard 重写为基于 cordis 的插件化平台。

## 要解决的问题

1. **核心与业务耦合**：路由注册、SSE、静态服务、停止流程交织在同一个 handler 里，新插件接入必须改核心代码
2. **副作用手工管理**：just 子进程、SSE 连接、fs.watch、token 缓存的清理散落各处，`/__stop` 靠手写调用链
3. **前端发现硬编码**：App.tsx 里 switch 逐个 import 插件，新增插件要改两处（前端 + 后端 registerBuiltin）
4. **`--mode` 语义别扭**：后端实际全量注册路由，`--mode` 只影响前端展示和 `/__files` 的分支行为，是半吊子隔离
5. **布局与架构错位**：共享 FileTree 只对 view 插件有意义，design 插件又自带一套树，侧栏结构冗余

## 成功标准

1. `src/server/index.ts` 与 `src/server/plugins.ts` 删除，core 以 cordis 服务插件形式存在，与业务插件平权
2. 所有后端路由/SSE/子进程/watcher 注册全部 effect 化：插件 dispose 后系统状态与加载前一致（验证：`/__stop` 触发统一逆序清理，无残留进程）
3. 前端新布局（图标导航栏 + 插件全屏工作区 + 卡片首页）落地，插件发现改为 `import.meta.glob`，新增内置插件零改 App.tsx
4. CLI 移除 `--mode`，新增 `--page`（仅决定 `--open` 的 URL hash）与 `--plugins`（外部插件目录）
5. 六个内置插件（view/bugs/review/design/apply/just）功能与重写前对齐（冒烟全过）
6. `pnpm build` + vitest 全绿
