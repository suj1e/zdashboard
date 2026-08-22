## Why

2.0 重写后每个插件工作区自己发明容器处理：view 缺留白、bugs/apply 裸卡片晾在平地上像手机屏、just 全出血——因为"点点背景 + 容器"只是 design 一家的自觉。同时侧边栏折叠按钮在重写中回归丢失，design 资产树混入代码噪音，演示用的 stats 插件该转正。需要把内容区待遇从**插件约定**升级为 **Shell 结构**：无论加多少插件，外观永远一致。

## What Changes

- **Shell 双槽结构（核心）**：插件契约扩展为 `{ Sidebar?, Workspace }` 两个槽。Shell 负责渲染 Sidebar 槽框架（含折叠 chevron、hover 临时展开、按 mode 记忆开合状态 localStorage）与 Content 槽（**结构性强制** dotBg 点点背景 + p-6 留白）；插件 Workspace 只交一张居中卡片
- **stats 内置化**：examples/stats 升为内置插件 `src/plugins/stats`（HTML viewer 改写 React Workspace + 后端 index.ts），侧边栏排在 view 之前（第一个插件位）；后端路由 `/__stats/data` 保留
- **design 去代码分组**：`design-assets.ts` 扫描跳过代码类文件（.ts/.js/.css/.json 等非 token），移除「代码」分组
- **bugs/apply/just/view 统一容器**：迁移到双槽结构，bugs/apply 表格卡宽度提升（max-w-6xl），just 终端卡居中浮于点点背景
- **examples 换便签插件**：新示例 🗒️ notes——POST 写文件持久化 + 列表编辑 + SSE 热刷新，演示写链路（stats 原为只读演示）
- **BREAKING（插件契约）**：`web.tsx` 新增可选 `Sidebar` 导出；Workspace 不再自带背景容器（内置迁移同步完成，外部 iframe 插件自动获得新容器无需改动）

## Capabilities

### New Capabilities

- `ui-shell`：Shell 双槽结构（Sidebar 槽 + Content 槽）、内容区强制容器、折叠交互
- `stats-plugin`：项目统计内置插件

### Modified Capabilities

- `dashboard-platform`：插件前端契约（web.tsx 增加 Sidebar 槽；Workspace 职责收窄为内容卡）；外部插件 viewer 自动获得结构化容器
