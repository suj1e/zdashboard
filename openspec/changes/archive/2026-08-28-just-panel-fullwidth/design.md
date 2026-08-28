# 设计:just 面板撑满主区

## 现有系统分析

`src/plugins/just/Workspace.tsx`:`<div className="mx-auto h-full max-w-6xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">`——`max-w-6xl`(72rem) 限宽。

## 方案设计

### 方案 A:去限宽(选定)

`max-w-6xl` 移除(保留 `mx-auto` 无害),其余样式不动。

**不做**:不动 LogViewer 内部布局;不动其他插件的 max-w(各页面形态独立决策)。

## 接口 / 数据契约

无。

## 实施步骤

1. 改 className;相关测试(若有宽度类断言)同步
2. 回归 + playground 手验

## 风险与 Trade-off

- 风险:无(纯 className)
- 开放问题:超宽行是否需要横向滚动——LogViewer 已有 overflow 处理,不新增

## 测试策略

- **组件**:Workspace 渲染无 `max-w-6xl` 类断言
- **回归**:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 宽度前后对比 | diagrams/width-before-after.html | 限宽居中 → 撑满主区 |
