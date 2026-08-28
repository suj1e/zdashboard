# 设计:apply 页面重构

## 现有系统分析

- `src/plugins/apply/SingleChangeView.tsx`：原 Workspace 迁移物——change 列表（卡片纵排）与选中详情上下堆叠，详情含 proposal/design/tasks Markdown 渲染、进度条、依赖徽标、🔧[人工] 徽标
- `src/plugins/apply/BatchView.tsx`：汇总条 → DependencyGraph/CheckpointViewer（组件 state 切换）→ plan 只读 → 日志尾，全部纵向平铺；空态三行引导
- `src/plugins/apply/Workspace.tsx`：Tab 壳 + PageHeader；`change`/`view`/`sel` URL 参数契约（align 后含重定向）
- 布局基建：`PluginPage`、语义 token（bg-background/border 等）、badge/ProgressBar 组件

## 方案设计

### 方案 A：分栏 + 分区 + 顶部统一（选定）

**SingleChangeView 分栏**：
- 外层 `flex h-full`：左列 `w-72 shrink-0 overflow-auto`（change 摘要卡列表，选中高亮，点击写 `change` param），右列 `flex-1 min-h-0 overflow-auto`（详情：进度头 → 任务列表 → proposal/design 折叠渲染）
- `<md` 断点退化单列（列表在上，`lg:` 起分栏）——Tailwind 响应式前缀实现
- 列表项摘要：名称 + done/total 进度 + hasDesign/inWorktree 等既有徽标 + 🔧[人工] 计数（**实施期裁决**：ChangeSummary 无 manual 字段，全列表计数需扩 /__apply 契约，与「不动 server 契约」冲突——裁决为仅选中项详情可见计数，即 craftsman 实现；若未来需要全列表计数，另立 server 契约扩展 change）

**BatchView 分区**：
- 顶部概览条 `shrink-0`：runId、状态 Badge、批次 i/n、完成 change 数、并发度、plan 摘要入口——一行
- 中部 `flex-1 min-h-0`：DependencyGraph ∥ CheckpointViewer 切换（沿用组件 state）
- 底部日志 `h-48 shrink-0 overflow-auto border-t`：日志尾固定高度独立滚动
- 空态维持现有三行引导（整页替换）

**顶部统一**：
- 两视图复用同一子组件形态（如 `ViewHeader` 局部组件）：同一 `px/py`、标题层级、右侧操作槽位；Workspace 壳的面包屑逻辑不动

**不做**：
- 不动 server 路由与数据契约（`/__apply*` 全系）
- 不动 URL 参数语义与 `?p=apply-batch` 重定向
- 不动 🔧[人工] 口径逻辑（徽标/剔除规则原样搬入新布局）
- 不引入新 UI 依赖（不引 datagrid/virtual list；列表量级 ≤ 数十项原生滚动足够）

**备选 B：引入左右可拖拽分割**——被否：增加状态管理复杂度，固定 280px 已覆盖当前量级。

## 接口 / 数据契约

无接口变更。URL：`?p=apply&view=single|batch&change=<name>&sel=<name>` 语义不变。

## 实施步骤

1. `ViewHeader` 局部组件抽取，两视图接入
2. SingleChangeView 分栏改造 + 响应式退化
3. BatchView 分区改造（概览条/主区/固定高日志）
4. 组件测试更新：分栏结构断言、选中联动、空态、深链回归
5. 回归 + playground 手验（含小屏宽度）

## 性能优化点

日志区固定高度后不再全页重排——SSE 高频日志下 layout 抖动显著下降。

## 设计模式建议

容器/展示分离不变；分栏选中状态继续走 URL（可分享、可回退），不引入组件树内选中状态。

## 风险与 Trade-off

- 风险：既有 workspace 测试断言的 DOM 结构大改 → 测试同步重写（语义断言优先，少依赖层级）
- 风险：小屏退化遗漏 → 响应式断言用例覆盖 lg 断点
- 开放问题：左列宽度 280px 是否够长 change 名——truncate + title 提示，实施时看效果可调

## 测试策略

- **组件**：单 change——分栏容器存在、点左列项写 `change` param 且右列详情切换；批量——概览条首屏元素（runId/状态/并发度）、日志区独立滚动容器、空态引导；顶部统一——两 Tab 同 header 结构断言
- **回归**：`?p=apply-batch` 重定向、`view` 参数非法回落、🔧[人工] 徽标、`pnpm typecheck && pnpm test` 全绿

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 布局前后对比 | diagrams/layout-before-after.html | 单 change 堆叠→分栏、批量长条→三段分区、顶部统一 |
