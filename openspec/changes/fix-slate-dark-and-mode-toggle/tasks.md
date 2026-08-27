# 任务:slate 主题色彩格式修复 + 明暗切换状态修复

- [x] T1 slate.css 色彩格式修复:light/dark 两块主色 RGB 三元组按 design.md 换算表转 HSL(只修格式不改调性);--success/--warning/--info/--destructive/--terminal-* 等格式正确变量不动
  - 测试验收:主题格式守卫单测(见 design 测试策略)红→绿;浏览器 slate × 明暗无棕橙偏色
- [x] T2 pixel.css audit:同规则检查,存在 RGB 三元组则一并修复,无则报告「无同类问题」
  - 测试验收:格式守卫单测覆盖 pixel.css(或有据豁免)
  - audit 结论:pixel.css light/dark 两块所有 hsl() 消费颜色变量本就为 HSL 三元组,无同类问题,零改动(守卫单测覆盖 pixel.css 且通过)
- [x] T3 ThemeToggle 状态化:mode 改 React state 源,toggle 同步 dataset/localStorage/setMode
  - 测试验收:连点 3 次 dataset 与奇偶一致(红→绿);单次点击图标翻转
- [x] T4 收尾:主题格式守卫测试纳入套件;`pnpm test` + `pnpm typecheck` + `pnpm build` 全绿;手工冒烟三主题 × 明暗
  - 测试验收:全绿 + 冒烟通过
  - 结果:test 36 文件 224/224(基线 217 + 新增 7),typecheck 零错,build 通过;冒烟:slate×明暗背景冷灰蓝无棕橙(slate-50/slate-900 computed 值正确),真实按钮连点 10 次严格交替、偶数次回初态、localStorage 同步,default/pixel 回归不受影响
- [x] T5 (实施期追加)terminal 令牌转 HSL:实际经 tailwind.config.ts `hsl(var(--terminal-bg/fg))` 消费,RGB 三元组被 hsl() 语义渲染成暗棕——globals.css/slate.css 全部 terminal 值转 HSL 三元组;守卫测试取消 terminal 白名单纳入守卫
  - 测试验收:取消白名单瞬间守卫红(slate 4 个 RGB terminal 声明)→ 转换后绿;终端区背景为正确深色
  - pixel.css audit 结论:无 `--terminal-bg/fg` 声明(default terminal token 落在 globals.css,已转),无同类问题,零改动
