## Why

复制粘贴成灾：ReviewViewer 整段复制 MdViewer（插件链改一处漏一处）；design/Workspace 复制 ImageViewer、CodeViewer 为无高亮降级版；目录 walk 三套（skip 列表已漂移）、进度条三处、筛选 pills 四处各写一套；9 个 badge 变体颜色三元链散落各插件。

## What Changes

- ReviewViewer 删复制 MdViewer/CodeBlock → import web/viewers/MdViewer
- design/Workspace 删复制 ImageViewer/降级 CodeViewer → import web/viewers；FontViewer 用 FontFace API 重写（现 fontFamily:url() 从未生效）
- 新建 ui/badge.tsx（shadcn Badge，cva 语义 variant：success/warning/info/neutral/destructive）；bugs/apply/review/StatusBar 的 9 个 badge 变体统一替换
- 抽共享：walkDir（三处 walk 合一，skip 列表参数化）；ProgressBar（三处）；FilterPills（四处，含 ARIA role=group/aria-pressed）
- parseTasks(md) 共享纯函数（apply 前后端两套 checkbox 正则合一）
- 死模块清理随 deps-activate change（不重复）

## Capabilities

### Modified
- dashboard-platform：前端组件复用约定（viewers/badge/共享原语）
