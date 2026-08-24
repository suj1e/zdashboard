## Why

当前 zdashboard 的文件变更热更新策略是"整页 F5"，用户保存文件后页面闪屏、滚动位置丢失、React 状态清空，体验极差。我们需要改为**丝滑无感知的局部刷新**：用户操作立即反馈，后台静默同步，页面永不重载。

## What Changes

- 移除 `App.tsx` 的 `location.reload()`，整页刷新改为局部更新
- 移除 `server.ts` INJECT 脚本中的 reload 监听逻辑
- `reload.ts` 不再 broadcast `reload` 事件，只保留 `files` 事件
- 补齐 view/design/stats/bugs plugin 的 `files` 事件监听，实现自动刷新
- review/apply plugin 改为**乐观更新**：用户操作立即更新 UI，后台静默确认
- view/design 文件树改为**增量 diff 更新**：新增/删除节点平滑动画，保留展开状态
- `fs.watch` 增加编辑器临时文件过滤，提升 debounce 到 300ms
- SSE 重连改为静默机制，去掉手动 1500ms timer 和红色断开状态

## Capabilities

### New Capabilities
- `smooth-reload`: 无感知热更新系统，包含局部刷新、乐观更新、增量 diff、静默重连

### Modified Capabilities
- 无（纯体验优化，不改变任何 spec 级行为）

## Impact

- **前端**：`src/web/App.tsx`、`src/web/hooks/useSSE.ts`、`src/plugins/view/Sidebar.tsx`、`src/plugins/design/Sidebar.tsx`、`src/plugins/stats/Workspace.tsx`、`src/plugins/bugs/Viewer.tsx`、`src/plugins/review/viewers/ReviewViewer.tsx`
- **后端**：`src/core/reload.ts`、`src/core/server.ts`
- **SSE 协议**：保留 `/__reload` 端点，但移除 `reload` 事件类型，只保留 `files`
- **无 breaking change**：对外 API 和 CLI 行为不变
