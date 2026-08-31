# 设计:错误反馈系统性修复

## 现有系统分析

巡检证据（三片汇总，file:line 见 UX 巡检报告 2026-08-31）：
- `MdViewer.tsx:45-52`：不查 `r.ok`，catch `setText('')` → 404 渲染乱码/空白
- `view/Sidebar.tsx:32-45`：三处 `.catch(() => [])` → 错误被缓存为成功空数据
- `stats/Workspace.tsx:45`：手写纯文本错误无重试；kit `ErrorState`/`Skeleton` 零使用
- `ImageViewer.tsx:28`：onError 复用「格式不支持」文案
- kit 已有完整三态原语：`AsyncBoundary`/`Skeleton`/`ErrorState(onRetry)`/`EmptyState`（PluginPage 另有 state 注入口，零插件使用）

## 方案设计

### 方案 A:fetch 门卫 + 三态收口（选定）

1. **`src/web/lib/fetchJson.ts`**（新）：
   ```ts
   export class HttpError extends Error { status: number }
   export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T>
   // 检查 res.ok,非 2xx 抛 HttpError(status, 尝试读 body error 字段)
   ```
2. **消费点收口**（usePluginData 的 fetcher 闭包与独立 fetch 全部改走 fetchJson）：
   view/Sidebar（去 `.catch(() => [])`，让 error 传播）、design/Sidebar、LogViewer recipes、stats/Workspace、TokenViewer
3. **viewer 特例**：MdViewer/CodeViewer 取文本而非 JSON → 提供 `fetchText(url)`（同查 r.ok），失败渲染 ErrorState；ImageViewer 用 `onError` 事件区分「加载失败」并给重试（重挂 src）
4. **三态接线**：各侧栏/工作区按 `loading → Skeleton`、`error → ErrorState(onRetry=reload)`、`空 → EmptyState(引导语)` 三分支渲染；view 侧栏空态注明约定扫描目录（openspec/docs/.zdev/apply）
5. **EmptyState 合并**：`components/EmptyState.tsx` 改 re-export kit 版，调用点（PlaceholderWorkspace 等）补 action 或去 tone

**不做**：
- 不动 usePluginData 缓存/失效机制（数据新鲜度归 2026-08-31-ux-data-freshness）
- 不动 LogViewer 日志区交互（归 just-log-ux）；仅修其 recipes fetcher
- 不做统一 toast 错误上报（静默刷新失败的降级提示归 data-freshness）

**备选 B:逐点各自修不引入门卫**——被否:11+ 处重复 `r.ok` 检查,下次新增 fetch 还会漏。

## 接口 / 数据契约

- 新增 `fetchJson<T>(url, init?): Promise<T>`、`fetchText(url, init?): Promise<string>`（HttpError 携带 status）
- kit ErrorState/Skeleton/EmptyState API 不变

## 实施步骤

1. TDD：fetchJson/fetchText 单测（2xx 透传/404 抛 HttpError/500 带 error 字段/网络异常）
2. 门卫替换：逐消费点切换 + 三态接线（view → design → just → stats → viewers）
3. EmptyState 合并 + 调用点修正
4. 回归 + playground 手验（mock 接口 500/404/空三分支）

## 风险与 Trade-off

- 风险：usePluginData 的 fetcher 抛错后进入 error 态——配合 data-freshness 的「保旧数据」策略才有完整体验；本 change 先保证错误可见 + 可重试
- 开放问题：无

## 测试策略

- **单元**：fetchJson/fetchText 四分支；EmptyState re-export 冒烟
- **组件**：view 侧栏 error→ErrorState 渲染、重试调用 reload；MdViewer 404→「文件不存在」；stats 错误态带重试
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 三态收口 | diagrams/three-states.html | fetchJson 门卫 + ErrorState/EmptyState 三态分流 |