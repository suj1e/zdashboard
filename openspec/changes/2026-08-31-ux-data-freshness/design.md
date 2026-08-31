# 设计:数据新鲜度链路

## 现有系统分析

- `useSSE.ts:23-31`：`conn.onopen` 的 wasLost 分支只调 `h.onFiles()`（App/StatusBar 层 handler）；`useSSEEvent` 挂载的插件频道监听不重挂也不失效
- `usePluginData.ts:100`：后台重取 catch → `setState({ data: null, error })`
- viewers：仅 `path` 变化时 fetch；不监听任何 SSE 事件
- `view/Workspace.tsx:47-50`：`contentRef` 恒久挂载，无滚动重置

## 方案设计

### 方案 A：重连逐频道补偿 + stale-while-revalidate + viewer 订阅（选定）

1. **重连补偿**：`useSSE` 维护 `channelSubs: Map<event, Set<handler>>`（`useSSEEvent` 注册进此表）；`onopen` wasLost 时对每个已订阅 event 手动调用其 handler（data 传 `''`）——`usePluginData` 的订阅把空 payload 视为「失效重取」信号（现有逻辑已把任意事件当失效，兼容）
2. **保旧数据**：`usePluginData` 重取失败分支改为 `setState({ error, data: prev.data })`（保留旧值）；新增 `staleError` 语义，ErrorState 仅在 `!data && error` 时全屏呈现，`data && error` 由调用方可选轻提示
3. **viewer 订阅**：`MdViewer/CodeViewer` 用 `useSSEEvent('files', ...)`，防抖 300ms 后重取当前 path；design viewers 同规则（misc/TokenViewer 的 fetch 加失效）。各 viewer 工具栏加刷新按钮（重取当前内容）
4. **滚动重置**：`Workspace.tsx` 对 `contentRef.current` 在 `file` 变化的 `useEffect` 里 `scrollTop = 0`（不用 key 重挂，避免 viewer 重复 fetch 闪屏）

**不做**：
- 不做断线横幅/全局重连按钮（断线文案统一归 ux-medium-polish）
- 不改 /__reload 服务端协议
- design viewer 的 iframe 强制重载仅在 files 命中当前资产时加时间戳参数（精确失效），不做全量 key 重挂

**备选 B：轮询兜底**——被否：SSE 修复后轮询冗余，且与「无周期性请求」的既有 spec 方向相悖。

## 接口 / 数据契约

- `usePluginData` 返回形状不变；新增语义：重取失败保留 `data`
- SSE 协议不变

## 实施步骤

1. TDD：useSSE 重连补偿（FakeES：断线→重开→断线期间注册的频道 handler 被调用）
2. TDD：usePluginData 重取失败保留 data；`!data && error` 才是全屏错误
3. viewer files 订阅 + 防抖 + 刷新按钮；Workspace 滚动重置
4. 回归 + playground 手验（改文件/断网重连/瞬时 500 mock）

## 性能优化点

viewer files 重取带 300ms 防抖 + 仅命中当前 path 时触发——批量保存场景不会风暴。

## 风险与 Trade-off

- 风险：重连逐频道补偿可能引发一次 refetch 风暴（多插件同时）——量级为每插件 1 请求，可接受；必要时加 100ms 错峰
- 开放问题：无

## 测试策略

- **单元**：useSSE 重连补偿（FakeES）；usePluginData 失败保 data / 无 data 时 error
- **组件**：MdViewer files 事件重取（防抖合并多次触发为一次）；Workspace 切文件 scrollTop=0；重取失败时旧内容仍在
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 新鲜度状态机 | diagrams/freshness-states.html | 断线补偿与刷新失败保旧数据 |