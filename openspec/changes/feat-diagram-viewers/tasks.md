# 任务:.excalidraw/.drawio 预览

- [x] 1. 共享 DiagramViewer:`src/web/viewers/DiagramViewer.tsx`(excalidraw lazy 只读画布 + drawio iframe `#R` + 损坏/超大/离线错误降级)+ 新依赖 `@excalidraw/excalidraw`(exact)
  - 验收:单测:excalidraw fixture → lazy 组件收到 initialData;drawio xml → iframe src 含 `#R`+encodeURIComponent;损坏 JSON 错误态;resolve 代理生效;build 产物含独立 excalidraw chunk
- [x] 2. view 接入:`viewerFor` 增 `.excalidraw`/`.drawio` → DiagramViewer
  - 验收:路由单测两扩展命中 DiagramViewer
- [x] 3. design 接入:categorize 增两扩展 → 新 AssetType `'diagram'`;viewers/ASSET_VIEWER_TYPES/VIEWERS 接 DiagramViewer;Sidebar 增「图表」分组;契约表测试同步
  - 验收:categorize/selectViewer/分组渲染单测;契约表绿
- [ ] 4. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;playground 放真实 .excalidraw/.drawio 各一,view/design 双入口预览 + 三主题 + 断网 drawio 降级
  - 验收:全绿 + 冒烟 checklist 入报告
