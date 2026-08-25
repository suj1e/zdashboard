# feat-apply-batch-dashboard

## 问题
zdashboard 目前缺乏 zapply batch 模式的可视化交互界面。用户无法：
1. 直观查看依赖图和执行计划
2. 实时监控多个 change 的并行执行
3. 在关键节点进行交互式确认
4. 查看细粒度的任务进度

## 方案
新建 `apply-batch` 插件，提供完整的 batch 可视化驾驶舱：

1. **依赖 DAG 可视化**：展示变更依赖关系，当前执行高亮，完成变绿
2. **实时 Dashboard**：进度条、日志流、耗时统计、ETA 预测
3. **ApprovalPanel**：执行计划确认、异常处理、调整参数（并行度、跳过项）
4. **CheckpointViewer**：每个 change 内部任务级进度展示
5. **WebSocket 实时推送**：后端主动推送状态更新，延迟 < 1s
6. **桌面通知集成**：关键节点系统原生通知

## 范围
- `src/plugins/apply-batch/`：新建插件目录
  - `web.tsx`：API 路由（REST + WebSocket）
  - `store.ts`：前端状态管理
  - `viewers/BatchDashboard.tsx`：主界面布局
  - `viewers/DependencyGraph.tsx`：DAG 可视化（使用 diagram-design）
  - `viewers/ApprovalPanel.tsx`：确认面板
  - `viewers/CheckpointViewer.tsx`：任务进度查看
- `src/server/apply-batch-store.ts`：后端状态管理
- `src/server/index.ts`：注册新 API

## 验收标准
- Dashboard 可展示依赖 DAG 和执行计划
- 用户可在 Dashboard 中确认/调整/跳过/重试
- 实时日志流更新（延迟 < 1s）
- WebSocket 连接稳定
- 桌面通知在关键节点触发
- 响应式布局，支持不同屏幕尺寸
