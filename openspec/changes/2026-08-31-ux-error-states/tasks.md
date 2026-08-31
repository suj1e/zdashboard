# 任务:错误反馈系统性修复

- [x] 1. TDD:`fetchJson`/`fetchText` 门卫(2xx 透传/404 抛 HttpError 带 status/500 读 body error/网络异常),viewer 文本流支持
  - 验收:单测先红后绿
- [x] 2. 三态接线:view 侧栏(去三处吞错)、design 侧栏、stats 工作区、LogViewer recipes——loading→Skeleton / error→ErrorState(onRetry) / 空→EmptyState
  - 验收:组件测试:mock 500 渲染 ErrorState、重试调 reload、空数据渲染 EmptyState 引导
- [x] 3. viewer 错误态:MdViewer/CodeViewer/TokenViewer 走 fetchText+ErrorState(404「文件不存在」与解析失败分开文案);ImageViewer onError 区分文案+重试
  - 验收:组件测试:404 文案断言、重试触发重新 fetch
- [x] 4. EmptyState 双实现合并(components 版 re-export kit),调用点修正
  - 验收:`grep -rn "components/EmptyState" src/` 仅 re-export;PlaceholderWorkspace 正常
- [x] 5. 回归 + playground 手验(mock 500/404/空三分支)
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);🔧[人工] 手验 checklist 由用户执行

## 审查修正轮(review fixes)

- [x] B2 SSE 静默刷新闪烁(违背 AGENTS.md 静默 refetch 纪律):骨架仅 `loading && !data` 初始加载渲染,有数据后台刷新静默——view/design 侧栏、LogViewer 三处接线统一;红→绿(SSE 静默刷新测试 ×3)
- [x] S2 App.tsx 本地吞错 `fetchJson` 改名 `loadJsonLenient`,消除与 lib/fetchJson 门卫同名反义
- [x] S3 stats 探测区:detect.error → 「justfile 探测失败」,不与「justfile ✗」混同语义
- [x] S4 空态/过滤态分离:view filter / design folder 过滤无匹配 → 「无匹配结果」,不误显「暂无数据」
- [x] S5 ImageViewer err/dim 随 path 重置(切图不残留旧错/旧尺寸)
- [x] B1 第 4 项补勾(代码上轮已完成,漏勾)

> 裁定(S1,不改码):proposal 成功标准 #4「数据面零漏网」口径为**插件数据面**(usePluginData + fetchJson/fetchText 门卫覆盖);shell 一次性配置拉取(/__config、/__detect 等 7 处宽松容错)维持现状。
> 跳过(S6):测试辅助重复与缩进,不修。
