# 设计:view 大纲体验

## 现有系统分析

- `OutlineNav.tsx:75`：`nav` 固定 `w-44`；`:86-93` 单行 `truncate` + `paddingLeft: 6 + (level-1)*10` 无上限
- 交互范式现成：`SidebarFrame.tsx:148-166` 的拖拽把手（拖拽/双击重置/ArrowKey/aria-valuetext）是全仓 a11y 标杆，抽取复用

## 方案设计

### 方案 A:tooltip + clamp + 把手复用(选定)

1. 大纲项 `title={item.text}` + `truncate` → `line-clamp-2`
2. 把手抽为 `src/web/components/ResizeHandle.tsx`（横竖两态，从 SidebarFrame 参数化抽取），OutlineNav 左缘竖把手接入；宽度 state 入 localStorage `zd-outline-w`（clamp 176–400，默认 176）
3. 缩进公式改 `6 + Math.min(level - 1, 2) * 10`（3 级后封顶）
4. `w-44` 改为 `style={{ width }}`（受控宽度）

**不做**：不做 hover 浮层（tooltip 已覆盖）；不做自动换行（长标题失控）；窄屏 <md 仍隐藏（浮层入口归 ux-medium-polish 批次）。

**备选 B:仅 tooltip**——被否:不解决「导航时需要看到」的主诉求,用户点名调宽。

## 接口 / 数据契约

新增 localStorage 键 `zd-outline-w:number`；`ResizeHandle` 组件 API（orientation/min/max/value/onChange/onReset）。

## 实施步骤

1. 抽取 ResizeHandle（SidebarFrame 同步切换复用,行为回归）
2. OutlineNav 接入宽度/tooltip/clamp/缩进封顶
3. 组件测试 + 回归 + 手验

## 风险与 Trade-off

- 风险:SidebarFrame 抽取回归 → 其现有测试(sidebar-url/sidebar 宽度)守门
- 开放问题:无

## 测试策略

- **组件**:OutlineNav 长标题渲染两行 + title 属性;把手拖拽改变宽度、双击重置、localStorage 持久化;SidebarFrame 回归(宽度/开合/键盘)
- **回归**:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 大纲前后对比 | diagrams/outline-before-after.html | 调宽/两行截断/tooltip |
### 覆盖率目标
- ResizeHandle 抽取后 SidebarFrame 既有测试 100% 通过;OutlineNav 新行为组件覆盖 ≥85%。

### 测试图示
- 测试金字塔:diagrams/test-pyramid.html(测试金字塔(4/8/2))
- 场景覆盖图:diagrams/scenario-coverage.html(五场景覆盖图)
