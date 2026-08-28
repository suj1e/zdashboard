# 设计:just 去侧边栏

## 现有系统分析

- `src/plugins/just/Sidebar.tsx`（53 行）：活跃任务列表，`usePluginData('/__just/tasks', subscribe 'plugin:just:state')`，点任务写 `task`/`recipe` param
- `src/plugins/just/Workspace.tsx`：`<LogViewer selected onSelect>`，LogViewer **已内嵌** recipe 列表（`rows`/running 计数/`isSel` 高亮/启停/清屏/总控台切换）
- `src/web/App.tsx` + `SidebarFrame`：`plugin?.Sidebar` 判空自动收栏——删除导出即收效，无需动布局层
- 结论：侧栏与 LogViewer 内嵌列表 100% 功能重叠，删除零功能损失

## 方案设计

### 方案 A：直接删除，零新增 UI（选定）

| 文件 | 改动 |
|------|------|
| `src/plugins/just/Sidebar.tsx` | 删除 |
| `src/plugins/just/web.tsx` | 删 `sidebar: lazy(...)` 导出 |
| `src/plugins/just/test/frontend.test.tsx` | 侧栏相关断言移除/改写为 LogViewer 内嵌列表断言 |

**不做**：
- 不动 LogViewer（内嵌列表即任务选择面）
- 不动 `SidebarFrame` 布局机制（判空收栏已存在）
- 不动 `/__just` 路由与 SSE 频道（LogViewer 内部消费不变）

**备选 B：侧栏保留改为「运行历史」**——被否：无此需求，YAGNI。

## 接口 / 数据契约

无变化。URL 参数 `recipe`/`task` 语义不变。

## 实施步骤

1. 删 `Sidebar.tsx`；`web.tsx` 去 sidebar 导出
2. 测试改写：任务选择断言落到 LogViewer 内嵌列表
3. 回归 + playground 手验（点 recipe → URL 变 → 日志聚焦）

## 风险与 Trade-off

- 风险：无（纯删除，主区能力完整覆盖）
- 开放问题：无

## 测试策略

- **组件**：web.tsx 不再含 sidebar 导出；LogViewer 列表点选 → URL param 断言（现有测试改写）
- **回归**：`pnpm typecheck && pnpm test` 全绿；`?p=just` 页无侧栏且日志可聚焦

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 布局前后对比 | diagrams/layout-before-after.html | before:侧栏与 LogViewer 内嵌列表重复;after:删侧栏、LogViewer 全宽为唯一选择面 |
