# 任务:Topbar 显示项目名

- [ ] 1. Topbar 增可选 `projectName` prop,品牌名后渲染 `/ <name>`(truncate + title);App.tsx 派生 basename 并传入,`document.title` 同步 `<name> · zdashboard`(无项目名不动 title)
  - 验收:组件测试(chip 渲染/缺省不渲染/truncate);App 集成测试(mock /__config → title 断言;root 缺失 title 不变);基线全绿
- [ ] 2. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;playground 手验:header 显示 `playground`、title 为 `playground · zdashboard`、深链接与主题切换不回归
  - 验收:全绿 + checklist 入报告
