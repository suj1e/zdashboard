# 任务:侧边栏拖拽调宽

- [x] 1. SidebarFrame 拖拽把手:pointer 拖拽实时改容器 `--sidebar-w`(clamp 220–480)、pointerup 持久化 localStorage['zd-sidebar-w']、双击恢复 280 清存储、键盘 ←/→ ±16px、role="separator";移动抽屉(<sm)与折叠态不渲染把手;非法 localStorage 值回退 280
  - 验收:组件测试(模拟 pointer 断言宽度跟随/持久化/clamp/双击重置;小视口与折叠态无把手;键盘调宽;非法存储值回退)先红后绿
- [ ] 2. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;手工冒烟:拖拽顺滑/三主题×明暗把手可见/移动抽屉无把手/刷新持久/`?p=view` 深链接、过滤、worktree 分组折叠不回归
  - 验收:全绿 + 冒烟 checklist 入报告
