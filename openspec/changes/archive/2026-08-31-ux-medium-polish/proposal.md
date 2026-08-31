## Why

UX 巡检 medium 级发现集中收口：深链接首屏闪首页、SSE 断线两处指示打架（「已断开」vs「重连中」）、iframe 外部插件零状态（黑洞）、HTTP 404/403 裸文本、focus-visible 基线缺失、slate 主色对比度 3.7:1、加载态三套并存、面包屑截断丢文件名、空态引导缺失（design/just）、后台刷新失败清空数据后的呈现（依赖 data-freshness 产物）。单项都小，合为一个打磨批次。

## What Changes

- **深链接/首载**：plugins 未加载完成时渲染整页 Skeleton 而非 HomeGrid；首页卡片骨架 3-6 张
- **断线文案统一**：Topbar 与 StatusBar 同源渲染，统一「重连中」，lost 点用 warning 色；lost 态点击状态 chip 触发整页刷新
- **iframe 三态**：ExternalWorkspace 加 onLoad 前 Skeleton + `zd:ready` 8s 超时 ErrorState（重试=重挂 iframe）+ 配置拉取失败提示条
- **HTTP 错误页**：404/403 极简 HTML 页（带返回链接）+ `Content-Type: text/plain; charset=utf-8`
- **focus-visible 基线**：globals.css 全局 `:focus-visible` outline（--ring），移除各处 `focus:outline-none`
- **slate 对比度**：light 模式 primary 调深一档（blue-600）或 foreground 换深色，达标 WCAG 4.5:1
- **面包屑**：文件名段 flex-none 不截断，中间路径 truncate + title
- **空态引导**：design 侧栏空态提示「运行 zdesign 生成」；just 假空态区分加载完成/未装 just
- **附带小项**：ImageViewer 错误文案勘正、StopButton confirm→ AlertDialog 化或保留记录、`zd-theme` 非法值兜底校验

## 成功标准

1. 深链接进入插件页无首页闪现
2. 断线时全屏只有一种说法（重连中 + warning 点）；点击可强刷
3. iframe 失败可见、可重试；404 页有样式有返回链接
4. 键盘 Tab 全局可见焦点环；slate 亮色 primary 对比度 ≥4.5:1
5. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/2026-08-31-ux-error-states/（ErrorState 复用）

## 优先级

- P2：单项皆小、合并一批打磨。
