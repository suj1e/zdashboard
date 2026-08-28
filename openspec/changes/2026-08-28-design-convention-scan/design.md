# 设计:design 约定化扫描

## 现有系统分析

- `src/plugins/design/manifest.ts`：`config: { folders: string[] }` 默认 `[]`
- `src/plugins/design/index.ts`：`/__design/assets` 读 `ctx.config().folders`；空数组 fallback `<root>/.zdev/design`（约定兜底已在），非空则逐目录 `scanAssets` 合并
- `src/plugins/design/Sidebar.tsx`：底部折叠配置区，`usePluginConfig('design', manifest.config)` + ConfigField + SSE `config` 频道失效重取
- 配置基建：`src/web/components/ConfigField.tsx`、`src/web/hooks/usePluginConfig.ts`、`src/web/test/hooks/usePluginConfig.test.tsx`——view/design 清理后全仓库无消费方
- 存储残留：`.zdev/dashboard.json` 的 `plugins.design.folders` 等键

## 方案设计

### 方案 A：恒扫约定目录，配置链路整体拆除（选定）

**改动清单**：

| 文件 | 改动 |
|------|------|
| `src/plugins/design/manifest.ts` | 删 `config` 字段 |
| `src/plugins/design/index.ts` | `setup` 恒用 `path.join(root, '.zdev', 'design')`；存在→`scanAssets`，缺失→`emptyScan()`；删 folders 合并逻辑与 `mergeScanResults`/`emptyScan` 中不再需要的部分（`emptyScan` 保留作缺失兜底） |
| `src/plugins/design/Sidebar.tsx` | 删配置区（按钮+折叠面板）、`usePluginConfig`/`handleConfigChange`/saving 状态；`usePluginData` 的 `subscribe: 'config'` 改为 `subscribe: 'files'`（配置频道不复存在，文件变更频道仍驱动资产刷新） |
| `src/web/components/ConfigField.tsx` | 删除（孤儿） |
| `src/web/hooks/usePluginConfig.ts` | 删除（孤儿） |
| `src/web/test/hooks/usePluginConfig.test.tsx` | 删除 |
| `src/core/instance.ts` 或 server 加载处 | 死键剥离泛化：仅保留「当前已注册 manifest.config 声明的键」，未声明键清除（承接 view change 的已知键剥离，此处收敛为通用规则） |

**不做**：
- 不动 `scanAssets`/`AssetFile`/`ScanResult` 数据形状与 `/__design/assets` 契约
- 不动 design 的类型分组（page/component/icon/token/md/video/audio/pdf/font）与 URL 参数（type/asset/folder——`folder` 参数仍用于资产路径过滤展示，语义不变）
- 不动配置中心后端路由 `/__plugins/config`（外部插件基建）

**备选 B：保留 folders 作为高级能力**——被否：与 zskills 约定冲突，双源真相徒增困惑。

## 接口 / 数据契约

不变：`GET /__design/assets` → `ScanResult`（九类分组的 `AssetFile[]`）。
删除：design 的 manifest.config；`config` SSE 频道消费点改 `files` 频道。

## 实施步骤

1. `design/index.ts` 约定化扫描
2. `design/Sidebar.tsx` 删配置区、订阅频道改 `files`
3. `design/manifest.ts` 删 config
4. 删孤儿组件（ConfigField/usePluginConfig + 测试）
5. 存储死键剥离泛化（未声明即清除）
6. 回归 + playground 手验

## 风险与 Trade-off

- 风险：曾有用户用 folders 指向约定外目录 → 缓解：changelog 注明迁移路径（把目录内容挪入 `.zdev/design/`）
- 风险：死键剥离泛化误删外部插件配置 → 缓解：剥离仅针对「已注册且 manifest 无 config 声明」的内置插件键；外部插件（external 标记）键保留
- 开放问题：无

## 测试策略

- **单元**：`/__design/assets` 缺失目录→空分组；存在→仅扫 `.zdev/design`；死键剥离泛化规则（内置无声明清除/外部保留）
- **组件**：design Sidebar 无配置入口；资产分组渲染回归
- **回归**：`pnpm typecheck && pnpm test` 全绿

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 约定化扫描 | diagrams/convention-scan.html | .zdev/design 约定目录 → scanAssets → 九类分组 → /__design/assets；folders 配置与孤儿组件删除标注 |
