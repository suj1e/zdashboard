## Context

当前 zdashboard 的热更新依赖 `fs.watch` → `broadcast('reload')` → `App.tsx: location.reload()` 的整页刷新链路。虽然已有 `files` SSE 事件用于局部更新，但 `reload` 事件优先级更高，导致局部更新形同虚设。此外，view/design/stats/bugs plugin 根本不监听 `files` 事件，文件树和资产列表永远是静态的。

## Goals / Non-Goals

**Goals:**
- 页面永不整页刷新，用户操作零感知
- 所有 plugin 支持文件变更时的局部自动刷新
- review/apply 支持乐观更新，用户点击后立即看到结果
- 文件树支持增量 diff 更新，保留展开/折叠状态
- SSE 断线重连静默无感知

**Non-Goals:**
- 不改变任何外部 API 或 CLI 行为
- 不引入新的后端框架或依赖
- 不实现全量 diff/merge 引擎（只做节点级增量更新）
- 不改变 just plugin 的独立 SSE 架构

## Decisions

### D1: 移除 `location.reload()`，保留 SSE 协议

**决策**：`App.tsx` 的 `onReload` 改为 no-op，`reload.ts` 不再 broadcast `reload` 事件，只保留 `files`。

** rationale**：整页刷新是体验差的根源。保留 SSE 端点 `/__reload` 仅用于向后兼容，实际只发 `files` 事件。

**替代方案**：完全移除 SSE，改用 WebSocket。 rejected — 过度设计，SSE 已足够。

### D2: 乐观更新模式

**决策**：review/apply 的 mutation 操作采用"先改本地 state，后台确认"的乐观更新模式。

** rationale**：用户点击保存后立即看到结果，不等服务器响应。失败时回滚并显示 toast。

**替代方案**：继续使用 pessimistic 模式（等服务器返回再更新）。 rejected — 体验差。

**实现**：统一封装 `optimisticUpdate(localPatch, serverPromise)` 工具函数。

### D3: 文件树增量 diff 更新

**决策**：view/design Sidebar 在 `files` 事件触发时，re-fetch 新 tree 后 diff 旧 tree，做动画过渡。

** rationale**：全量替换会导致展开状态丢失和视觉闪烁。增量 diff 保留用户上下文。

**替代方案**：简单 re-fetch + 全量替换。 rejected — 体验差。

**实现**：`diffTree(oldTree, newTree)` 返回 `{ added, removed, unchanged }`，TreeDir 根据结果做 `animate-in`/`animate-out`。

### D4: SSE 静默重连

**决策**：去掉 `useSSE.ts` 中的手动 1500ms timer，让 EventSource 原生重连生效。重连成功后静默 refreshKey++。

** rationale**：EventSource 原生已有指数退避重连，手动 timer 与之冲突且造成 1.5s 盲区。

**替代方案**：保留手动 timer 但改为 500ms。 rejected — 仍 fighting 原生机制。

### D5: fs.watch 策略优化

**决策**：过滤编辑器临时文件（`.swp`, `.tmp`, `~` 后缀, `.DS_Store`, `Thumbs.db`），debounce 从 150ms 提升到 300ms。

** rationale**：减少噪音，避免 IDE 批量保存触发多次刷新。

**替代方案**：使用 chokidar 替换 fs.watch。 rejected — 新增依赖，当前需求用过滤+debounce 已足够。

## Risks / Trade-offs

| Risk | 影响 | 缓解 |
|------|------|------|
| 乐观更新回滚逻辑复杂 | 中 | 统一封装 `optimisticUpdate`，各 plugin 只提供 patch 函数 |
| diffTree 实现可能有 corner case | 低 | 先实现基础版（按 path 匹配），复杂场景 fallback 全量替换 |
| fs.watch 在 Windows 深层目录仍可能丢事件 | 低 | 保留手动刷新按钮作为 fallback |
| SSE 断线期间事件丢失 | 中 | 重连后静默全量刷新，保证最终一致性 |
| 300ms debounce 对某些用户仍感觉慢 | 低 | 可配置，后续可调 |

## Migration Plan

1. **Phase 1**：移除 reload → 验证页面不闪
2. **Phase 2**：乐观更新 review → 验证交互即时反馈
3. **Phase 3**：增量树更新 → 验证文件树平滑
4. **Phase 4**：静默 SSE → 验证断线无感
5. **Phase 5**：智能广播 → 验证按需刷新

每步独立发布，可随时回滚。

## Open Questions

- 无。
