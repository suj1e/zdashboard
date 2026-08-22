# Tasks: 主题系统

## Phase 1 令牌完备化

- [ ] 1.1 globals.css 增 --success/--warning/--info（含 .dark 与 light 值）；tailwind.config colors 映射 success/warning/info
- [ ] 1.2 78 处语义色脚本替换（emerald/amber/sky/red→success/warning/info/destructive；成对 dark: variant 删除；呼吸点等装饰色保留并在报告中列清单）
- [ ] 1.3 borderRadius/shadowBox 挂变量（config 级，类名不动）；globals.css 加 .dot-grid 类替换两处内联点阵

## Phase 2 主题机制

- [ ] 2.1 src/web/lib/themes.ts 注册表（dark/light/pixel + swatch）
- [ ] 2.2 globals.css：.dark 迁移为 [data-theme="dark"]（保留 alias）；[data-theme="pixel"] 覆盖块（实色调板/radius 0/shadow none/点阵加强）
- [ ] 2.3 main.tsx 读 zd-theme（迁移旧 zdashboard-theme）设 dataset.theme；ThemeToggle 重写为 DropdownMenu 主题选择器（swatch 预览 + check 选中 + 持久化）——需 copy shadcn dropdown-menu 组件并装 @radix-ui/react-dropdown-menu

## Phase 3 验收

- [ ] 3.1 硬标准：git grep 确认 pixel 主题仅 globals.css 参与、零 tsx 改动
- [ ] 3.2 三主题 × 7 工作区浏览器走查无漏色（emerald 残留=漏）；胶囊→方框、阴影消失在 pixel 下生效
- [ ] 3.3 build + vitest + tsc 全绿；旧 dark 用户迁移无缝
