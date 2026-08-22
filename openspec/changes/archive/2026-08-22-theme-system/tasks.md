# Tasks: 主题系统（双维度模型：mode × style）

## Phase 1 令牌完备化

- [x] 1.1 globals.css 增 --success/--warning/--info（含 .dark 与 light 值）；tailwind.config colors 映射 success/warning/info
- [x] 1.2 78 处语义色脚本替换（emerald/amber/sky/red→success/warning/info/destructive；成对 dark: variant 删除；呼吸点等装饰色保留并在报告中列清单）
- [x] 1.3 borderRadius/shadowBox 挂变量（config 级，类名不动）；globals.css 加 .dot-grid 类替换两处内联点阵

## Phase 2 主题机制（双维度）

- [x] 2.1 src/web/lib/themes.ts 风格注册表（default + pixel + swatch；明暗不在注册表）
- [x] 2.2 globals.css：[data-mode="dark"] 控制明暗中性色板；[data-theme="pixel"] 控制风格级变量（radius 0/shadow none/实色调色板/点阵加强）；pixel 暗亮两态用 [data-theme="pixel"][data-mode="dark"] 组合选择器
- [x] 2.3 main.tsx 读 zd-mode（迁移旧 zdashboard-theme）设 dataset.mode；读 zd-theme 设 dataset.theme，默认 'default'
- [x] 2.3 ThemeToggle 保留为明暗切换按钮（Sun/Moon）；新增 StyleSelect.tsx（Palette 图标 + DropdownMenu，每风格 4 色 swatch + Check 选中）；Topbar 同时包含两者

## Phase 3 验收

- [x] 3.1 硬标准：git grep 确认 pixel 风格仅 globals.css + themes.ts 参与、零 tsx 改动（机制文件 StyleSelect.tsx/dropdown-menu 除外）
- [x] 3.2 双维度走查：dark/default、light/default、dark/pixel、light/pixel 四态 × 首页/view/design/bugs/review/apply/just 无漏色；pixel 下胶囊变方/阴影消失/点阵加强
- [x] 3.3 build + vitest + tsc 全绿；旧 dark 用户迁移无缝（zdashboard-theme → zd-mode）
