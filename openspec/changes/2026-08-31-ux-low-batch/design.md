# 设计:UX 低优批次

## 现有系统分析（巡检证据索引）

- 持久化缺口：view/Sidebar.tsx:112-113（折叠 state）、design/Workspace.tsx:53-55（视口 state）、Sidebar.tsx:71（分组 useState）
- 存储不一致：ThemeToggle.tsx:17/StyleSelect.tsx:18/main.tsx:18-19 裸 setItem vs SidebarFrame.tsx:56-58 已包 try/catch
- 反馈缺口：MdViewer.tsx:17-24/CodeViewer.tsx:44-51 复制失败静默；usePluginData.ts:97 loading 未消费
- a11y：view/Sidebar.tsx:66-83/155-169 无 aria-expanded；LogViewer.tsx:222 无 tabIndex/role；IconButton.tsx:18 热区 19px；prefers-reduced-motion 全仓 0 命中；StatusBar.tsx:26 live 点常驻 pulse
- 文案：StatusBar.tsx:50 `clean` 英文；just/manifest.ts:7「Just Runner」
- 日志小项：just-runner.ts:114 仅按 0x0A 切行（`\r` 攒团）；LogViewer 独立 EventSource（useSSE.ts:7 单连接约定）
- 度量：design/Workspace.tsx:69 工具栏高度 vs LogViewer.tsx:208 h-8

## 方案设计

### 方案 A:工具先行 + 逐点清(选定)

1. `src/web/lib/safeStorage.ts`：`getItem/setItem/removeItem` try/catch 包装；全仓 localStorage 直调点接入
2. `prefersReducedMotion` hook + globals.css `@media (prefers-reduced-motion: reduce)` 关闭 animate-pulse/scale；live 点改静态 success 色仅 lost/connecting 有动效
3. 持久化三处：view 折叠集合、design 分组/视口（键沿用 `zd-` 前缀规范）
4. 复制失败/刷新 spinner/aria 补齐/热区扩大：逐点 1-3 行
5. 文案：`clean`→「干净」；其余基线写入本 design 备查
6. `\r` 分段：runner 在 0x0A 切行基础上对段内 `\r` 再切分推送 `{ type:'log', cr: true }`，LogViewer 对 cr 行做「替换上一行」渲染（无 `\r` 场景零变化）；若评估前端回写复杂度高，降级为仅切分不回写（进度条变为多行快照），实施时定并报告
7. logs EventSource 并入共享频道：`/__just/logs` SSE 保留（runner 流式协议），前端 LogViewer 改经 `useSSEEvent('plugin:just:log', ...)` 消费（广播已存在，`just/index.ts:37`）；`/__just/logs` 路由保留一个版本周期

**不做**：不做日志下载/持久化；不做虚拟滚动；不动 spec。

## 接口 / 数据契约

- 新增 localStorage 键：`zd-view-collapse`、`zd-design-groups`、`zd-design-viewport`（均 JSON，safeStorage 访问）
- SSE：LogViewer 数据源从 `/__just/logs` 独立连接切到共享 `/__reload` 的 `plugin:just:log` 频道；服务端 `/__just/logs` 路由暂留

## 实施步骤

1. safeStorage 工具 + 全仓接入
2. reduced-motion（CSS + hook + live 点）
3. 持久化三处
4. 反馈两处 + a11y 四处
5. 文案基线 + 度量统一
6. `\r` 分段 + logs 频道迁移（评估后定深度）
7. 回归 + 手验

## 风险与 Trade-off

- 风险：logs 频道迁移破坏 /__just/logs 外部消费方 → 路由保留一版,本期仅前端切换
- 风险：`\r` 回写渲染复杂 → 降级方案已备
- 开放问题：无

## 测试策略

- **单元**：safeStorage（正常/抛异常）；`\r` 切分
- **组件**：折叠态持久化（rerender 后保持）；reduced-motion 类断言；live 点静态断言；日志 cr 行回写（或快照）
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 低优清单 | diagrams/low-batch.html | 四域低优项与前置 |