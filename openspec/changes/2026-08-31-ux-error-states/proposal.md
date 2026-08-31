## Why

三路 UX 巡检一致认定：**错误反馈系统性缺失**是全仓信任层面第一毒瘤。`fetch` 全程不查 `r.ok`（MdViewer 404 把错误页渲染成乱码、ImageViewer 404 谎报「格式不支持」、TokenViewer 失败谎报「没有 CSS 变量」）；view 侧栏三处 `.catch(() => [])` 吞错后还被 usePluginData 缓存成「成功空数据」，错误永不可恢复；kit 的 `ErrorState`（带重试）/`Skeleton` 全仓零使用，stats 手写纯文本错误。用户在十余个入口遇到的是「无声失败」。

## What Changes

- **统一 fetch 门卫**：新增 `src/web/lib/fetchJson.ts`（或同名工具）——`fetchJson(url)` 检查 `r.ok`、非 2xx 抛出含状态码的错误；全仓数据型 fetch 收口经过它
- **三态收口**：view/design/just/stats 侧栏与工作区统一消费 kit `Skeleton`/`ErrorState(onRetry)/EmptyState`；加载、错误、空三态可区分
- **viewer 错误态**：MdViewer/CodeViewer/ImageViewer 失败渲染 ErrorState + 重试，404 文案「文件不存在」与解析失败分开；删除「该格式无法预览」的错误复用
- **具体修复点**：MdViewer:45、CodeViewer:31、ImageViewer:28、TokenViewer:48、view/Sidebar:32-45（去吞错）、design/Sidebar:39、LogViewer:52、stats/Workspace:45
- EmptyState 双实现合并（components 版改 re-export kit 版）

## 成功标准

1. 任一数据接口 500/断网时，对应区域显示 ErrorState + 重试按钮；点击重试可恢复
2. 预览 404 显示「文件不存在」而非乱码/格式误导
3. 「服务挂了」与「项目没数据」在所有侧栏可区分
4. `grep -rn "r.json()" src/ | grep -v fetchJson` 数据型请求零漏网（viewer 的文本流除外）
5. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。建议最先交付（后续 UX change 的 ErrorState 消费方）。

## 优先级

- P1：信任层第一毒瘤，三片巡检共同 Top。
