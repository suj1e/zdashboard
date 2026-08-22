# Tasks: deps-activate

- [x] 1.1 bugs.ts loadConfig → YAML.parse + 字段校验（url/product）
- [x] 1.2 激活 formatBytes：stats Workspace MB、CodeViewer 字节
- [x] 1.3 LogViewer fmtElapsed → date-fns；view Sidebar 过滤 → useDebouncedValue(150)
- [x] 1.4 SidebarFrame localStorage → useLocalStorage(@uidotdev/usehooks)，修 mode 切换重读边角
- [x] 1.5 sonner：关键错误路径 toast（StopButton 失败/just 动作失败/SSE 断连提示可选）
- [x] 1.6 SidebarFrame chevron SVG ×2 → lucide ChevronLeft；utils 死 import 删
- [x] 1.7 删 i18n/、constants/{routes,filters}.ts；bugs Viewer 复制的 STATUS_FILTERS 清理
- [x] 1.8 openUrl → execFile；cli parseArgs → node:util parseArgs
- [x] 1.9 build+vitest 全绿 + 冒烟（bugs 端点行为不变、过滤防抖生效、toast 展示）
