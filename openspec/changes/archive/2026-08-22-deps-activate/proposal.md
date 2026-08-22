## Why

项目装了 date-fns/filesize/use-debounce/@uidotdev/usehooks/sonner/react-error-boundary 等依赖却几乎零使用：时长/字节格式化手搓、树过滤每击键全树重算、SidebarFrame 手写 32 行 localStorage、报错走 console 而非已挂载的 toast；bugs.ts 手搓 yaml 解析而 yaml 包就在依赖里（review-store 已在用）；另有 i18n 字典/routes/filters 常量三个死模块与死 import。

## What Changes

- bugs.ts loadConfig 手搓 yaml → YAML.parse（yaml 包），保留字段校验
- 激活死依赖：stats/CodeViewer 用 formatBytes（filesize）；LogViewer fmtElapsed 用 date-fns intervalToDuration/formatDistance；view Sidebar 树过滤接 use-debounce（useDebouncedValue 150ms）；SidebarFrame localStorage 逻辑换 @uidotdev/usehooks useLocalStorage；utils.ts 删死 debounce import
- sonner 接入：StopButton/just 动作失败等关键错误改 toast（替代 console.error）
- chevron 手绘 SVG（SidebarFrame 两处）→ lucide ChevronLeft
- 删死模块：src/web/lib/i18n/、lib/constants/{routes,filters}.ts（bugs Viewer 里复制的一份 STATUS_FILTERS 一并清理）；ErrorBoundary 评估换 react-error-boundary（已装）或保留（二选一，按改动收益定）
- openUrl exec 拼接 → execFile(cmd, [url])；cli 参数解析评估 node:util parseArgs（内置）

## Capabilities

### Modified
- dashboard-platform：bugs 配置解析统一 yaml 包；前端交互反馈（toast）
