# Tasks: dedup-components

- [x] 1.1 ReviewViewer → import MdViewer（删 59-115 复制段，保留业务包裹）
- [x] 1.2 design/Workspace → import ImageViewer/CodeViewer（删复制段）
- [x] 1.3 FontViewer FontFace API 重写（加载后渲染 + 度量显示）
- [x] 1.4 ui/badge.tsx 新建；9 个 badge 变体替换（bugs×2/apply×4/review/StatusBar chip/其他）
- [x] 1.5 walkDir 共享（spec-scan/stats/design-assets 三处合一，skip 参数化）；ProgressBar 共享（stats/apply/review）
- [x] 1.6 FilterPills 共享（bugs/review/LogViewer 药丸行/design 视口段）+ ARIA
- [x] 1.7 parseTasks 共享（apply scan 与 Viewer TaskList）
- [x] 1.8 build+vitest 全绿 + 浏览器冒烟（review/design 渲染不回归、badge 视觉一致）
