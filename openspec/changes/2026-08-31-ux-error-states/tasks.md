# 任务:错误反馈系统性修复

- [x] 1. TDD:`fetchJson`/`fetchText` 门卫(2xx 透传/404 抛 HttpError 带 status/500 读 body error/网络异常),viewer 文本流支持
  - 验收:单测先红后绿
- [x] 2. 三态接线:view 侧栏(去三处吞错)、design 侧栏、stats 工作区、LogViewer recipes——loading→Skeleton / error→ErrorState(onRetry) / 空→EmptyState
  - 验收:组件测试:mock 500 渲染 ErrorState、重试调 reload、空数据渲染 EmptyState 引导
- [x] 3. viewer 错误态:MdViewer/CodeViewer/TokenViewer 走 fetchText+ErrorState(404「文件不存在」与解析失败分开文案);ImageViewer onError 区分文案+重试
  - 验收:组件测试:404 文案断言、重试触发重新 fetch
- [ ] 4. EmptyState 双实现合并(components 版 re-export kit),调用点修正
  - 验收:`grep -rn "components/EmptyState" src/` 仅 re-export;PlaceholderWorkspace 正常
- [ ] 5. 回归 + playground 手验(mock 500/404/空三分支)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行
