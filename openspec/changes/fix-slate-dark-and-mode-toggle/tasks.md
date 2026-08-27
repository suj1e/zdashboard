# 任务:slate 主题色彩格式修复 + 明暗切换状态修复

- [ ] T1 slate.css 色彩格式修复:light/dark 两块主色 RGB 三元组按 design.md 换算表转 HSL(只修格式不改调性);--success/--warning/--info/--destructive/--terminal-* 等格式正确变量不动
  - 测试验收:主题格式守卫单测(见 design 测试策略)红→绿;浏览器 slate × 明暗无棕橙偏色
- [ ] T2 pixel.css audit:同规则检查,存在 RGB 三元组则一并修复,无则报告「无同类问题」
  - 测试验收:格式守卫单测覆盖 pixel.css(或有据豁免)
- [ ] T3 ThemeToggle 状态化:mode 改 React state 源,toggle 同步 dataset/localStorage/setMode
  - 测试验收:连点 3 次 dataset 与奇偶一致(红→绿);单次点击图标翻转
- [ ] T4 收尾:主题格式守卫测试纳入套件;`pnpm test` + `pnpm typecheck` + `pnpm build` 全绿;手工冒烟三主题 × 明暗
  - 测试验收:全绿 + 冒烟通过
