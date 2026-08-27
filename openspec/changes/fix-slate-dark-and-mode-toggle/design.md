# 设计:slate 主题色彩格式修复 + 明暗切换状态修复

## 根因分析

### 缺陷 1:slate.css 色彩变量格式

- 全局约定(tailwind.config + globals.css):颜色 token 是 **HSL 三元组**,消费端一律 `hsl(var(--x))`(globals.css:109 等)。
- `src/web/themes/slate.css` 的 light 块与 dark 块中,主色按 RGB 十进制三元组书写(--background/--foreground/--card/--card-foreground/--popover/--popover-foreground/--primary/--secondary/--secondary-foreground/--muted/--muted-foreground/--accent/--accent-foreground/--border/--input/--ring;--primary-foreground 等白/黑值两种格式碰巧等价);仅 --success/--warning/--info/--destructive 系与 --terminal-bg/fg 格式正确(rgb 消费)。
- 修复:按 Tailwind slate/blue 标准色把 RGB 值换算为 HSL 三元组。已知换算表(slate 系):
  - `248 250 252` (#F8FAFC) → `210 40% 98%`
  - `241 245 249` (#F1F5F9) → `210 40% 96%`
  - `226 232 240` (#E2E8F0) → `214 32% 91%`
  - `203 213 225` (#CBD5E1) → `213 27% 84%`
  - `148 163 184` (#94A3B8) → `215 20% 65%`
  - `100 116 139` (#64748B) → `215 16% 47%`
  - `71 85 105` (#475569) → `215 19% 35%`
  - `51 65 85` (#334155) → `215 25% 27%`
  - `30 41 59` (#1E293B) → `217 33% 17%`
  - `15 23 42` (#0F172A) → `222 47% 11%`
  - `2 6 23` (#020617) → `222 84% 5%`(仅 terminal-bg,rgb 消费,不动,列此备查)
  - `59 130 246` (#3B82F6 blue-500) → `217 91% 60%`
  - 两个块中 `0 0% 100%`/`0 0% 3.9%` 类已是 HSL,不动。
- dark 块以文件现值为准逐个换算,不做重新设计(只修格式,不改调性)。
- **pixel.css 需同规则 audit**:存在同类 RGB 三元组则一并修(报告写明 audit 结论);default token 在 globals.css 内,已验证为 HSL,不动。

### 缺陷 2:ThemeToggle 陈旧闭包

- 现实现(render 时读 dataset,toggle 只写 DOM):状态源不是 React 状态,连点基于陈旧值计算 next。
- 修复:`const [mode, setMode] = useState(...)` 为状态源;toggle 内 setMode(next) 与 dataset/localStorage 同步写;图标随 state 渲染。初始化仍以 dataset 为初值(main.tsx 已在启动时写入)。
- 不引入 context/store(单组件局部状态足够,最小惊讶)。

## 测试策略

1. **单元(vitest)**:
   - 主题格式守卫:解析 src/web/themes/*.css,断言所有「被 hsl() 消费」的颜色变量值匹配 `^\d{1,3} \d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$`(白名单排除 --terminal-bg/fg 与 shadow/radius/text 等非 HSL 变量);pixel.css 若在修复范围同样纳入。此测试防回归(未来再写入 RGB 三元组立即红)。
   - ThemeToggle:fireEvent 连点 3 次 → dataset.mode 按 dark→light→dark→light 翻转、localStorage 同步、图标 aria/title 稳定;单次点击后图标随 state 翻转(修复前因不重渲染而红)。
2. **手工冒烟**:Topbar 切 slate 主题 × 明暗,背景为冷灰蓝、无棕橙偏色;连点明暗按钮 10 次,终态与奇偶一致;另两主题回归不受影响。
3. **边界**:slate.css 中本就正确的 HSL 变量(--success 等)不得被改动(格式守卫天然覆盖);terminal 系变量保持 RGB。

## 风险与 Trade-off

- 换算表若个别色值手误,偏差限于 slate 主题观感——以 Tailwind 官方 slate/blue HSL 值为唯一来源,不自由发挥。
- ThemeToggle 改为受控状态后,若有第三方代码直接写 dataset.mode(仅 main.tsx 初始化,无其他),图标不会感知——现状无此调用方,记录为已知边界。
