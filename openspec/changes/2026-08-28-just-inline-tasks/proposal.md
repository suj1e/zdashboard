# 2026-08-28-just-inline-tasks

just runner 移除侧边栏,任务选择由主区 LogViewer 承担

## 需求复述

just 插件的侧边栏只有一块「活跃任务列表」，但主区 `LogViewer` **已经内嵌了完整的 recipe 列表**（running 状态点、运行计数、选中高亮、启停/清屏按钮、总控台切换）。侧栏与主区功能完全重复，纯冗余——直接删除侧边栏即可，无需新做任何任务列 UI。

## 要解决的问题

1. 侧边栏与主区 LogViewer 内嵌列表功能重复，两处选中状态可能不一致的认知负担
2. 侧栏为 0-3 条的列表独占整列，空间浪费

## 成功标准

1. `src/plugins/just/Sidebar.tsx` 删除；`web.tsx` 移除 sidebar 导出
2. 任务选择语义不变：LogViewer 内嵌列表点 recipe → `recipe`/`task` param 写 URL（现有 `onSelect` 回调链路原样）
3. IconRail 进入 just 页不再渲染侧栏（`SidebarFrame` 按 `plugin?.Sidebar` 判空，现有机制自动收栏）
4. `pnpm typecheck && pnpm test` 全绿

## 依赖

无前置。

## 优先级

- P2：纯冗余清理，无功能新增。
