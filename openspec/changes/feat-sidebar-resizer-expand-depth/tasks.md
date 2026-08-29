# 任务:侧边栏拖拽调宽 + 默认展开深度可配置

- [ ] 1. SidebarFrame 拖拽把手:pointer 拖拽实时改容器 `--sidebar-w`(clamp 220–480)、pointerup 持久化 localStorage、双击恢复 280 清存储、键盘 ←/→ ±16px、role="separator";移动抽屉/折叠态不渲染把手
  - 验收:组件测试(模拟 pointer 断言宽度跟随/持久化/clamp/双击重置;小视口无把手;键盘调宽)先红后绿
- [ ] 2. view 展开深度服务端透传:`view/manifest.ts` 增 `config.defaultExpandDepth`(select 1–4,默认 2);`core/tree.ts` /__files 读取 `getPluginConfig('view')` 透传 `scanTree` opts(NaN/越界兜底 2,clamp 1–4)
  - 验收:路由单测:配置 3 时第三层不折叠、1 时仅根层展开、非法值兜底;manifest 经 /__plugins 暴露 config
- [ ] 3. view Sidebar 深度 select:初始值 GET /__plugins/config,变更 POST(带 getStopToken),成功后 refetch /__files;失败 toast 不 refetch
  - 验收:组件测试(mock fetch):初始渲染、POST body/header 断言、成功 refetch、失败不 refetch
- [ ] 4. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;手工冒烟:拖拽顺滑/三主题×明暗把手/移动抽屉无把手/深度 1–4 观感/配置刷新持久/`?p=view` 深链接与过滤不回归
  - 验收:全绿 + 冒烟 checklist 入报告
