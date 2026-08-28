## Why

design 插件约定化（2026-08-28-design-convention-scan）后资产恒扫 `<root>/.zdev/design/`，但 viewers（`src/plugins/design/viewers/PageViewer.tsx:3`、`viewers/misc.tsx:18`）以 `iframe src={'/' + encodeURI(path)}` 直取服务器根——约定路径（如 `icons/logo.svg`）请求 `/icons/logo.svg` 必然 404。旧代码同病，昔日靠「`.zdev/design` 缺失时 fallback 扫根」掩盖；约定化后无兜底，资产预览全断。

## What Changes

- design 插件新增只读路由 `GET /__design/asset?path=<rel>`：校验路径（拒绝 `..`/绝对路径/反斜杠），从 `<root>/.zdev/design/` 读文件流式返回（MIME 按扩展名,复用 core/server 的 MIME 表）
- viewers 的 iframe src 改走 `/__design/asset?path=` 代理
- md/video/audio/pdf/font 等多类 viewer 统一切换,`__file-content` 不适用（其根是项目根,不含 `.zdev` 段拼接语义）

## 成功标准

1. `.zdev/design/` 下任一资产（svg/图片/md/视频等）经 `/__design/asset` 可预览,路径穿越攻击返回 400/403
2. `pnpm typecheck && pnpm test` 全绿;design 插件测试补代理路由单测（合法/穿越/缺失三分支）
3. playground 手验:资产点击预览正常

## 依赖

- 前置:openspec/changes/archive/2026-08-28-design-convention-scan/（已归档）

## 优先级

- P1：design 插件当前核心交互（资产预览）在约定目录下不可用,属功能性缺陷。
