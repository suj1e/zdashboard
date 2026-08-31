## Why

UX 巡检 low 级发现集中批次：单项皆小（多为 1-5 行）且独立，合并一批清掉。内容：UI 偏好持久化补齐（折叠态/视口模式/分组展开）、复制失败反馈、SSE 刷新轻指示、a11y 细节（aria-expanded/role=log/热区/Reduced Motion）、文案语言基线、`\r` 进度条分段、组件日志双连接、design 工具栏度量统一。

## What Changes

- **持久化**：view 折叠集合（collapsedWt/collapsedRoot）→ localStorage；design 分组展开态、视口模式/自定义宽高 → localStorage；`safeStorage` 工具（try/catch 包装，ThemeToggle/main/StyleSelect 接入）
- **反馈**：复制失败按钮短暂显示「复制失败」；usePluginData 后台刷新期间树头部轻 spinner
- **a11y**：树/目录按钮补 `aria-expanded`；日志容器 `tabIndex=0` + `role="log"` + `aria-live="polite"`；IconButton 热区扩至 ≥24px；`prefers-reduced-motion: reduce` 全局关闭 pulse/scale；live 状态点改静态色仅断线脉冲
- **文案基线**：专有名词/命令保留英文，状态形容词一律中文（`clean`→「干净」）；「Just Runner」作为例外明知保留
- **日志小项**：`\r` 分段推送（runner 对 `\r` 也切分,前端行内回写或分段渲染）；行数截断已归 just-log-ux；logs 独立 EventSource 并入共享频道评估（若改动大则仅记录）
- **度量**：design 工具栏高度对齐 `h-8`；树缩进 px 封顶同步（与 view-outline-ux 协同）

## 成功标准

1. 上述持久化项刷新/切换后保持；禁用存储不崩
2. reduced-motion 下无 pulse/scale 动画
3. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/2026-08-31-ux-medium-polish/(避免同文件冲突)
- 前置:openspec/changes/2026-08-31-just-log-ux/(日志区改造之上)

## 优先级

- P3：锦上添花,随批次顺收。
