## Why

view 插件的大纲目录（OutlineNav）固定 `w-44`（176px）+ 单行 `truncate`，中文长标题截断后大纲失去导航意义，且无任何手段看全（无 tooltip、不可调宽）。层级缩进（每级 10px）进一步压缩三级标题可用宽度。用户实测确认体验差。

## What Changes

- **hover 提示**：大纲项加 `title={item.text}`，悬停看全文（1 行，基本盘）
- **两行截断**：单行 truncate → `line-clamp-2`，可见信息翻倍
- **拖拽调宽**：大纲左缘加拖拽手柄（复用 SidebarFrame 把手交互范式：拖拽 + 双击重置 + 方向键微调 + aria），宽度入 localStorage（`zd-outline-w`，clamp 176–400px）
- **缩进封顶**：层级缩进封顶 3 级（之后不再递增），保障深层标题可用宽度

## 成功标准

1. 悬停任一大纲项可见完整标题
2. 两行内标题完整可见；超两行 tooltip 兜底
3. 拖拽调宽范围 176–400px，双击重置，刷新后保持
4. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。

## 优先级

- P2：用户点名的体验问题，view 高频页面。
