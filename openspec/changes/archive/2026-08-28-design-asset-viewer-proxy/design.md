# 设计:design 资产代理路由

## 现有系统分析

- `src/plugins/design/viewers/PageViewer.tsx:3`、`viewers/misc.tsx:18`：`iframe src={'/' + encodeURI(path)}` 直取根
- `src/core/server.ts` MIME 表齐备;`/__file-content` 路由有同型路径校验先例（join root + 前缀检查）
- 资产相对路径基准 = `<root>/.zdev/design/`（约定化后唯一扫描根）

## 方案设计

### 方案 A：`/__design/asset?path=` 只读代理（选定）

- design 插件 `index.ts` 新增路由：读 `path` query → 拒绝 `..`、绝对路径、反斜杠 → `path.join(root, '.zdev', 'design', rel)` → 二次前缀校验 → `fs.createReadStream` 流式返回,`Content-Type` 按 MIME 表
- viewers 改 `iframe src={'/__design/asset?path=' + encodeURI(path)}`
- 复用 core/server MIME 常量（若未导出则从 server.ts 导出,不复制表）

**不做**：不改扫描逻辑/ScanResult;不动 `/__design/assets`;不做写操作。

**备选 B：viewers 走 `/__file-content/.zdev/design/...` 拼接**——被否：语义泄漏（view 插件路由承载 design 资产）,且 `.zdev` 拼接规则散落前端。

## 接口 / 数据契约

`GET /__design/asset?path=<rel-to-.zdev/design>` → 文件流（200）/ 400（缺参/非法）/ 404（不存在）

## 实施步骤

1. TDD:路由三分支单测（合法 svg 200+MIME、`../` 穿越 400、缺失 404）
2. 实现代理路由;viewers 切换 src
3. playground 手验 + 全量回归

## 风险与 Trade-off

- 风险:路径校验遗漏致任意读 → 三重防御(字符拒绝+join+前缀校验)+单测钉住
- 开放问题:playground 演示资产迁移(见 impl-report 决策项)

## 测试策略

- **单元**:代理路由三分支;MIME 断言(svg→image/svg+xml)
- **组件**:viewer iframe src 含 `/__design/asset?path=`
- **回归**:`pnpm typecheck && pnpm test` 全绿
