# 设计:view 约定化扫描

## 现有系统分析

- `src/plugins/view/manifest.ts`：声明 `config: { scanDirs, defaultExpandDepth, showHidden }`
- `src/plugins/view/Sidebar.tsx`：顶部设置按钮 + 配置弹窗（Portal），`usePluginConfig('view', manifest.config)` + draft 状态 + commitSave；树数据来自 `/__worktrees` + `/__files?wt=` + `/__files`
- `src/core/tree.ts`：`/__files` 路由读 `dashboard.getConfig('view')` 传 `scanDirs`（fallback `['openspec']`）与 options
- `src/server/spec-scan.ts`：`scanTree(root, scanDirs, opts)`，`ScanTreeOptions = { hiddenDirs?, showHidden?, defaultExpandDepth? }`
- `src/core/worktrees.ts`：`git worktree list --porcelain` 过滤 `.zworktree/` 段（约定已存在，不动）

## 方案设计

### 方案 A：约定写死，配置链路整体拆除（选定）

思路：扫描目标即生态约定，不存在「用户偏好」维度。删除配置 schema、UI、读取链路，`scanTree` 保留白名单模型但由调用方传约定常量。

**改动清单**：

| 文件 | 改动 |
|------|------|
| `src/plugins/view/manifest.ts` | 删 `config` 字段整体 |
| `src/plugins/view/Sidebar.tsx` | 删设置按钮、配置弹窗（Portal）、`usePluginConfig`/draft/commitSave；保留过滤框 + worktree 组 + 当前分支组 + `trees.reload()` |
| `src/core/tree.ts` | 删 `dashboard.getConfig('view')` 读取；`scanTree(scanRoot, ['openspec', 'docs'])`，options 不传 |
| `src/server/spec-scan.ts` | `ScanTreeOptions` 收敛为 `{ defaultExpandDepth?: number }`（内部固定 2）；删 `hiddenDirs`/`showHidden` 参数与 `walkDir` 透传 |
| `src/core/instance.ts`（或 server 加载处） | 读 `dashboard.json` 时剥离死键：`plugins.view.*`（scanDirs/defaultExpandDepth/showHidden）——存储残留清理 |

**不做**：
- 不动 `just`/`design` 插件（各自 change 承担）
- 不动 `/__files`、`/__worktrees`、`/__file-content` API 形状与 URL 参数契约（wt/file/filter）
- 不动 worktree 发现逻辑（`.zworktree/` 段过滤已是约定）
- 不删通用配置中心基础设施（`/__plugins/config` 路由、`DashboardService.getConfig`）——外部插件仍可用；view/design 不再声明 config 后自然为空

**备选 B：保留 schema 仅删 UI**——被否：死代码 + 存储残留无消费方，误导后续维护者以为可配置。

## 接口 / 数据契约

不变：
- `GET /__files?wt=<abs>` → `{ tree: TreeNode[] }`；tree 仅含约定目录
- `GET /__worktrees` → `WorktreeInfo[]`
- URL 参数：`wt`/`file`/`filter`（manifest.params 不变）

删除：
- manifest.config（view）；对应 `usePluginConfig('view', ...)` 调用点消失

## 实施步骤

1. `spec-scan.ts` 选项收敛（签名瘦身，调用方同步）
2. `core/tree.ts` 改传约定常量 `['openspec', 'docs']`，删配置读取
3. `view/manifest.ts` 删 config；`view/Sidebar.tsx` 删配置 UI 与 hook
4. `dashboard.json` 加载时剥离 `plugins.view` 死键（含既有测试数据样例更新）
5. 更新/补充测试：spec-scan 单测（约定目录）、sidebar 无配置入口快照

## 风险与 Trade-off

- 风险：曾依赖 `showHidden` 查看隐藏文件的用户失去能力 → 缓解：约定目录（openspec/docs）内隐藏文件本就罕见；真需要时用 IDE
- 风险：`plugins.view` 死键剥离若误删并发写入 → 缓解：复用 `writePluginsConfig` 的 tmp+rename 原子写模式，仅启动时执行一次
- 开放问题：剥离逻辑是否要做成通用「schema 未声明的键即清除」→ 本期从简，仅剥已知死键

## 测试策略

见 tasks.md 各项验收；分层：

- **单元**：`spec-scan.ts` 约定扫描（存在/缺失目录、深度固定、路径前缀完整）；`instance.ts` 死键剥离
- **组件**：`view/Sidebar` 渲染无配置按钮、worktree 分组结构、过滤行为（沿用现有 sidebar-url 测试基建）
- **回归**：`pnpm typecheck && pnpm test` 全绿；`?p=view&wt=&file=` URL 集成测试不变形

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 扫描数据流 | diagrams/scan-flow.html | 当前分支 + .zworktree 各根 → 约定白名单扫描 → /__files / /__worktrees → 侧边栏树；配置链路删除标注 |
