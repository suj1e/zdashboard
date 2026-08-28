# 设计:apply 合并执行进度插件

## 现有系统分析

| | apply（单 change） | apply-batch（批量） |
|---|---|---|
| server | `scan.ts` 扫 `openspec/changes/`，2 条读路由 `/__apply`、`/__apply/change` | `ApplyBatchStore` 读 `.zapply/batch-state.json`，3 读 + 7 写路由（guardedRoute），500ms 节流写广播 |
| web | Workspace 218 行：change 列表 + proposal/design/tasks 渲染 + 进度条 | Workspace 189 行 + viewers（DependencyGraph/ApprovalPanel/CheckpointViewer） |
| 数据 | 只读 | store 内存态 + 写文件（双写源头） |
| 刷新 | `usePluginData` subscribe SSE | `subscribe: 'plugin:apply-batch:state'`（store 变更广播） |

关键事实：
- `BatchState` 接口与 zskills `batch-state.schema.json` 字段逐一吻合（version/status/changes/batches/currentBatchIndex/parallelism/logs/conflicts），**只是路径不同**——迁移成本低
- 新约定：`.zdev/apply/CURRENT`（纯文本 runId）→ `.zdev/apply/runs/<runId>/state.json`；历史 run 只读留档
- 写广播节流（throttle.ts）只为写操作服务；只读后外部 skill 写文件，刷新信号改搭全局 reload `files` 事件（fs.watch 递归监听 root，`.zdev/apply` 在其下）

## 方案设计

### 方案 A：合并进 apply 插件，Tab 切换，批量只读（选定）

**server 侧**（`src/plugins/apply/`）：
- `batch.ts`（新，替代 `ApplyBatchStore`）：`readBatchState(root)` →
  1. 读 `.zdev/apply/CURRENT`（trim 取 runId；非法字符拒绝 `[A-Za-z0-9-]`）
  2. 读 `runs/<runId>/state.json`，JSON 解析失败/缺失 → null
  3. 返回 `{ run: { id, startedAt? }, state: BatchState | null }`
- 路由（全部只读）：
  - `GET /__apply` → 原 scanApplyChanges（不变）
  - `GET /__apply/change?name=` → 原样
  - `GET /__apply/batch` → readBatchState
  - `GET /__apply/batch/graph` → 由 batch state 投影（changes/batches/conflicts 摘要，同原 shape）
  - `GET /__apply/batch/logs` → `state.logs.slice(-100)`
- 删：全部 guardedRoute 写路由、`ApplyBatchStore` 写方法、节流广播

**web 侧**（`src/plugins/apply/`）：
- `manifest.ts`：mode `apply` 不变，description 更新「OpenSpec 执行进度 · zapply 单 change 与批量」；params 增 `view`（single/batch）、`sel`（批量选中 change）
- `Workspace.tsx`：顶部 Tab 条（单 change｜批量驾驶舱）→ 读/写 `view` param；Tab 内容懒加载拆包
  - `SingleChangeView.tsx`：原 apply Workspace 内容
  - `BatchView.tsx`：原 apply-batch Workspace 裁剪——保留 DependencyGraph、CheckpointViewer、日志流；ApprovalPanel 写控件删除，仅读展示 plan 摘要（若 `runs/<runId>/plan.md` 存在则经 `/__apply/batch/plan` 读取展示）
  - 刷新订阅：`plugin:apply:state` 改 `files`（全局文件事件）
- 路由 `GET /__apply/batch/plan` → 读 `runs/<runId>/plan.md` 文本（只读）

**删除**：`src/plugins/apply-batch/` 整目录（manifest/index/throttle/web/Workspace/viewers/tests）；`src/server/apply-batch-store.ts` 及其测试。

**兼容**：`?p=apply-batch` → App 未知 mode 回落首页（注册表驱动，零代码）；README 若有截图/链接另行更新（不在本 change 代码范围）。

**备选 B：双插件保留、仅数据源迁移**——被否：不解决信息架构分裂，图标仍重复。
**备选 C：只读+批量缺省**——用户已拍板 Tab 双视图；无批量数据时批量 Tab 显空态引导，不隐藏 Tab（可发现性优先）。

## 接口 / 数据契约

```ts
// GET /__apply/batch
{ run: { id: string } | null, state: BatchState | null }
// state 缺失场景：无 CURRENT / run 目录缺失 / JSON 损坏 → state: null, 前端空态引导
```

URL：`?p=apply&view=single|batch&change=<name>&sel=<name>`

## 实施步骤

1. server：新建 `batch.ts` 只读读取器（CURRENT 解析 + 校验 + 空态语义）+ 3 条读路由 + plan 路由
2. server：删 ApplyBatchStore、写路由、throttle
3. web：manifest params 扩展；Workspace 改 Tab 壳
4. web：原 Workspace 内容迁 `SingleChangeView`；apply-batch viewers 迁入裁剪为 `BatchView`
5. 删 `src/plugins/apply-batch/`、`src/server/apply-batch-store.ts`；测试迁移改写（store 测试→batch reader 测试；workspace 测试→Tab 切换测试）
6. 回归 + playground 手验（mock 一个 runs/<runId>/ 三件套）

## 性能优化点

- 只读化后无 500ms 节流广播循环；刷新依赖 fs.watch `files` 事件（已有全局去抖 300ms），事件量级下降
- Tab 懒加载：BatchView 三 viewers 按 Tab 激活分包，首屏不载 graph 依赖

## 设计模式建议

- 只读投影（read model）：`batch.ts` 是无状态投影函数，不持缓存——state.json 由外部写，缓存失效复杂度不值得（文件小，读廉价）
- Tab 壳 + 懒加载子视图：沿用 SDK `defineWebPlugin` 的 lazy 分包惯例

## 风险与 Trade-off

- 风险：旧 `.zapply/batch-state.json` 用户升级后批量页空 → 缓解：空态文案给出两行说明（新约定路径 + 历史数据不迁移的原因）；不做自动迁移（skill 生态已切新约定，迁移旧文件无消费方）
- 风险：CURRENT 指向历史 run（skill 语义：未达终态才续跑）→ 展示即历史快照，空态文案注明「历史 run 只读」
- 风险：fs.watch 在部分平台对 `.zdev` 深层目录事件抖动 → 兜底：BatchView 提供 5s 轮询降级开关（`usePluginData` polling 能力）
- 开放问题：ApprovalPanel 是否值得保留为纯 plan 展示 → 按「保留最小只读展示」实施，若实现中发现信息冗余可裁为纯 graph+logs（tasks 中标注可裁）

## 测试策略

- **单元**：`batch.ts`——CURRENT 缺失/非法字符/JSON 损坏/正常四分支；graph 投影形状
- **组件**：Tab 切换 URL 语义（view param 读写）；单 change 视图回归（现有 apply workspace 测试迁移）；批量空态引导文案
- **集成**：playground mock runs 三件套 → 手验 Tab、graph、日志流、plan 展示
- **回归**：`pnpm typecheck && pnpm test` 全绿；`?p=apply-batch` 回落首页

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 合并架构 | diagrams/merge-architecture.html | 合并后单插件 Tab 结构、.zdev/apply 只读投影数据流、写路由与 store 删除标注 |
