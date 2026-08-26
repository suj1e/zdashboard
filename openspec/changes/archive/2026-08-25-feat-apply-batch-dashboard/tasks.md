# Tasks

## 1. 创建 apply-batch 插件结构
- [ ] 创建 `src/plugins/apply-batch/` 目录
- [ ] 创建 `web.tsx`（API 路由入口）
- [ ] 创建 `store.ts`（前端状态管理）

## 2. 实现后端 API 和 store
- [ ] 创建 `src/server/apply-batch-store.ts`
- [ ] 实现状态读写：changes、logs、checkpoint、approval
- [ ] 注册 API 路由到 `src/server/index.ts`
- [ ] 实现 REST 端点：
  - [ ] GET `/__apply-batch/status`
  - [ ] GET `/__apply-batch/changes`
  - [ ] GET `/__apply-batch/graph`
  - [ ] GET `/__apply-batch/logs`
  - [ ] POST `/__apply-batch/approve`
  - [ ] POST `/__apply-batch/adjust`
  - [ ] POST `/__apply-batch/retry`
  - [ ] POST `/__apply-batch/pause`
  - [ ] POST `/__apply-batch/resume`

## 3. 实现前端 Dashboard 和 DAG
- [ ] 创建 `viewers/BatchDashboard.tsx`（主界面布局）
- [ ] 创建 `viewers/DependencyGraph.tsx`（依赖 DAG 可视化）
- [ ] 创建 `viewers/GanttChart.tsx`（甘特图）
- [ ] 集成 diagram-design 渲染 DAG

## 4. 实现 ApprovalPanel 和 CheckpointViewer
- [ ] 创建 `viewers/ApprovalPanel.tsx`（确认面板）
- [ ] 创建 `viewers/CheckpointViewer.tsx`（任务进度）
- [ ] 实现交互逻辑：确认/跳过/重试/调整

## 5. WebSocket 实时推送
- [ ] 在 `web.tsx` 中实现 WebSocket 端点
- [ ] 实现状态变更时主动推送
- [ ] 前端连接和自动重连
- [ ] 延迟优化（目标 < 1s）

## 6. 桌面通知集成
- [ ] 集成系统桌面通知 API
- [ ] 定义通知触发点（批次完成、异常、完成）
- [ ] 实现通知开关（--notify）

## 7. 测试和验证
- [ ] 验证 proposal 通过 `openspec validate`
- [ ] 端到端测试：启动 → 确认 → 执行 → 完成
- [ ] 响应式布局测试
- [ ] WebSocket 连接稳定性测试
