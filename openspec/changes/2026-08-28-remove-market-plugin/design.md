# 设计:移除 market 插件

## 现有系统分析

- `src/plugins/market/`：25 文件（index/manifest/web/Workspace/PromptPanel/useCatalog/motion-css/prompt/urls/sources×4/tabs×3/tests×10）
- 注册面：`src/cli.ts:27`（import）+ `:140`（BUILTIN_PLUGINS 数组）
- 契约面：`src/plugins/test/manifests.test.ts:14,21,36,41`（import/注册表/params 断言）
- 图标：`src/web/lib/icons.tsx:87`（`market: 'sparkles'`）
- spec：dashboard-platform「灵感市场插件」requirement（1 SHALL + 4 scenario，`spec.md:388-408`）
- 首页/IconRail：注册表驱动，删除 manifest 即自动消失，无需改布局层

## 方案设计

### 方案 A：整目录删除 + spec REMOVED delta（选定）

| 位置 | 改动 |
|------|------|
| `src/plugins/market/` | 整目录删除 |
| `src/cli.ts` | 去 import 与注册项 |
| `src/plugins/test/manifests.test.ts` | 去 market import/注册表行/params 断言（`market=tab/q/entry`） |
| `src/web/lib/icons.tsx` | 去 `market: 'sparkles'` 映射与类型联合中的对应键（如有） |
| `openspec/changes/<name>/specs/dashboard-platform/spec.md` | `## REMOVED Requirements`——移样「灵感市场插件」requirement 全文（4 scenario 一并移除） |
| `README.md` | 若有 market 段落/模式列表则清理（实施时 grep 确认） |

**不做**：
- 不动外部插件机制（ext-plugins 沙箱/postMessage 桥与 market 无关，保留）
- 不动 `sparkles` 图标本体在其他模式的使用（EmptyState `empty:primary` 也用 Sparkles，仅删 market 键映射）
- 不动配置中心基建（market 的 `/__market/proxy` 随目录删除，`/__plugins/config` 保留）

**备选 B：保留目录仅下架注册**——被否：死代码 25 文件，误导维护者。

## 接口 / 数据契约

- 删除：`?p=market`（未知 mode 回落首页，App 现有机制）；`/__market/proxy` 路由
- 不变：其余 5 插件路由/参数/事件全部不动

## 实施步骤

1. spec REMOVED delta 落盘
2. 删目录 + cli/契约测试/图标清理
3. `pnpm typecheck && pnpm test` 全绿
4. playground 手验：IconRail 5 插件、`?p=market` 回落首页

## 风险与 Trade-off

- 风险：用户书签 `?p=market` 回落首页（预期行为，与 apply-batch 重定向不同——market 无后继页面，无需映射）
- 风险：`sparkles` 键误删波及 EmptyState——删除前 grep 使用点
- 开放问题：无

## 测试策略

- **结构**：`grep -ri market src/` 零命中；`openspec validate` 通过（REMOVED delta 解析）
- **组件**：App 未知 mode `?p=market` 回落首页（沿用既有测试形态）
- **回归**：manifests 契约测试更新后全绿；`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 移除总览 | diagrams/removal.html | IconRail 五格→四格(apply 已于 601171d 先行删除)，四路清理清单 |
