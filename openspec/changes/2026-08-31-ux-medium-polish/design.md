# 设计:UX 中优批次

## 现有系统分析（巡检证据索引）

- 首页闪现：App.tsx:56-60（plugins 空 → HomeGrid）
- 断线打架：Topbar.tsx:10,17 vs StatusBar.tsx:26,63
- iframe 黑洞：ExternalWorkspace.tsx:100-109（onLoad 前/失败/超时全无）；config 静默 :56
- HTTP 裸文本：server.ts:146,195,234,298
- focus-visible：仅 ui/button.tsx:8 与 HomeGrid.tsx:45 有；view/Sidebar.tsx:145 反向移除 outline
- slate 对比度：themes/slate.css:27-28（blue-500+白 ≈3.7:1）
- 面包屑：kit/PageHeader.tsx:25 整段 truncate
- 空态引导：design/Sidebar.tsx:52-63、LogViewer.tsx:172
- 主题兜底：main.tsx:24 非法值原样写入

## 方案设计

### 方案 A:逐点修复,不引入新抽象(选定)

| 项 | 改法 |
|---|---|
| 首页闪现 | App 增 `pluginsReady` 标志(首次返回非空即 true);未 ready 渲染 `Skeleton rows={6}` 全页;HomeGrid 骨架卡片 3 张 |
| 断线统一 | 抽 `useConnStatus()` 单源;Topbar/StatusBar 同文案「重连中」;lost 点 `bg-warning`;StatusBar lost 态整 chip 变按钮 `onClick=location.reload()` |
| iframe 三态 | `loaded`(onLoad)/`handshaked`(zd:ready)/`timeout`(8s) 三态;未 handshaked 渲染 Skeleton 覆盖层;timeout 渲染 ErrorState(onRetry=重挂 iframe + key++) |
| 404 页 | server `sendErrorPage(res, code)` 输出极简内联 HTML(标题/说明/返回 `/` 链接),`Content-Type: text/html; charset=utf-8`;API 路径(`/__`前缀)仍返回 JSON |
| focus-visible | globals.css 全局 `:focus-visible { outline:2px solid hsl(var(--ring)); outline-offset:2px }`;移除各组件 `focus:outline-none`(保留 border 色变化) |
| slate 对比度 | light primary → blue-600,验证 4.5:1;pixel/default 不动 |
| 面包屑 | PageHeader 分段渲染:末段 `flex-none font-medium`,前段 truncate + title |
| 空态引导 | design 侧栏 `!loading && groups 空` → 引导文案;LogViewer 空态区分 loading/未装 just/无 justfile |
| 主题兜底 | main.tsx 读取时校验 STYLES/MODES,非法回落 default/light |

**不做**：不做窄屏大纲浮层（另行评估）；不动 guard/认证逻辑；不做完整 a11y 审计（low 批次）。

**备选 B:每项独立 change**——被否:单项皆 ≤10 行,拆分仪式成本大于收益;同主题合并一批。

## 接口 / 数据契约

无对外契约变更；`sendErrorPage` 为 server 内部方法。

## 实施步骤

1. App ready 标志 + 骨架；断线单源统一
2. iframe 三态 + 超时；server 错误页
3. focus-visible 全局 + slate 对比度
4. 面包屑分段 + 空态引导 + 主题兜底
5. 回归 + 手验

## 风险与 Trade-off

- 风险：全局 focus-visible 改变现有视觉 → 逐处走查,样式统一走 --ring token
- 风险：iframe 超时误报(慢插件) → 8s 阈值 + 重试不销毁 iframe(覆盖层可关)
- 开放问题：无

## 测试策略

- **组件**：App 未 ready 骨架；iframe timeout → ErrorState、重试重挂；StatusBar lost 态点击触发 reload；面包屑长路径断言末段完整
- **单元**：sendErrorPage 输出 Content-Type/HTML；主题兜底校验函数
- **人工**：🔧[人工] 键盘 Tab 走查焦点环；slate 对比度目测/取色器核验；断线(杀服务)双指示核验
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 修复地图 | diagrams/fix-map.html | 九项 medium 修复按域分布 |
### 覆盖率目标
- sendErrorPage/主题兜底纯函数分支 ≥90%;骨架/iframe/状态条组件覆盖 ≥85%;对比度与键盘走查为人工核验项。

### 测试图示
- 测试金字塔:diagrams/test-pyramid.html(测试金字塔(8/12/4))
- 场景覆盖图:diagrams/scenario-coverage.html(八场景覆盖图)
