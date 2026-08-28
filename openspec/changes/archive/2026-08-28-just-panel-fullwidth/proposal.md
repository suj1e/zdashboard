## Why

just 日志主区套了 `max-w-6xl` 居中限宽卡片，宽屏下大量横向空间浪费；日志是典型「越宽越好读」的内容形态，应撑满主区可用宽度。

## What Changes

- `src/plugins/just/Workspace.tsx` 容器去掉 `max-w-6xl`，撑满主区（保留圆角卡片/边框/内边距样式）

## 成功标准

1. 日志区宽度 = 主区可用宽度（无 max-w 限宽）
2. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。

## 优先级

- P2：一行布局修正。
