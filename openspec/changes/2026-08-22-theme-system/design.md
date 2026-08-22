# Design: 主题系统

基于 main（2.3.1 后）。现状关键文件：`src/web/globals.css`（shadcn HSL 令牌 + `.dark` 覆盖）、`tailwind.config.ts`（colors 全走 `hsl(var(--...))`）、`src/web/components/ThemeToggle.tsx`（dark class 切换 + localStorage `zdashboard-theme`）、`src/web/main.tsx`（启动时读 localStorage 设 dark class）。

## Phase 1 令牌完备化

### 1.1 语义色令牌

globals.css `:root` 增加：
```css
--success: 142 76% 36%;   /* ≈ emerald-600 */
--success-foreground: 0 0% 100%;
--warning: 32 95% 44%;    /* ≈ amber-600 */
--info: 199 89% 48%;      /* ≈ sky-500 */
```
`.dark`（→ data-theme="dark"）覆盖对应亮色值（emerald-400/amber-400/sky-400 系）。tailwind.config colors 映射 `success/warning/info`（含 foreground）。

**替换规则（脚本执行，78 处）**：
- `text-emerald-600 dark:text-emerald-400` → `text-success dark:text-success`（dark: 前缀在 data-theme 机制下由变量自身暗色值接管，**成对的 dark: variant 直接删**——这是关键：令牌化后 dark 变体冗余）
- 同理 amber→warning、sky→info、red-500/600→destructive（已有令牌）
- `bg-emerald-500`（呼吸点/实心）这类**品牌动作色**（非状态语义）保留字面量不换——区分"状态语义色"与"装饰色"：badge/状态点/成功失败提示是语义（换），呼吸绿点/选中主色走 primary（已是令牌）

### 1.2 圆角/阴影令牌/点阵类

- tailwind config `borderRadius` 已有 `lg: var(--radius)`——扩展 `sm/md/full` 三档全走 `--radius-*` 变量（:root 定义现值；pixel 主题全置 0）
- 57 处 `rounded-*` 字面量：**不做全量类名替换**（rounded-md 等 tailwind 原生类已在 config 指向变量后自动跟随），只把 config 的 borderRadius 值改为变量引用——这一步是**配置级替换**，类名不动，pixel 时 `--radius-md: 0` 即全站直角
- 同理 boxShadow 的 shadow-sm/md 挂变量
- 点阵：globals.css 加 `.dot-grid`（现 radial-gradient 20px 网格），App.tsx 与 design Workspace 两处内联 style 换 className；pixel 主题下加深点距（覆盖 background-size）

### 1.3 保留区（设计说明）

半透明 `bg-primary/10` 17 处保留（pixel 下实色板配低饱和底色变量即可不发灰，不改组件）；动效词汇 13 处保留（动效主题化超出本期）。

## Phase 2 data-theme 机制

### 2.1 主题注册表 `src/web/lib/themes.ts`

```ts
export interface ThemeDef { id: 'dark' | 'light' | 'pixel'; label: string; swatch: string[] /* 4色预览 */ }
export const THEMES: ThemeDef[] = [
  { id: 'dark',  label: 'Dark',  swatch: ['#09090b', '#18181b', '#6366f1', '#fafafa'] },
  { id: 'light', label: 'Light', swatch: ['#ffffff', '#f4f4f5', '#4f46e5', '#18181b'] },
  { id: 'pixel', label: 'Pixel', swatch: ['#1a1c2c', '#5d275d', '#ef7d57', '#38b764'] },
];
```

### 2.2 globals.css 结构

- `:root` = light 值；`[data-theme="dark"]`（从 `.dark` 迁移，`.dark` 保留 alias 一个版本防外部引用）；`[data-theme="pixel"]` 覆盖块
- pixel 覆盖：Sweetie-16 风格 4-8 色实色（背景 #1a1c2c、surface #29366f→实色、primary #ef7d57、success #38b764、warning #b86f50、info #41a6f6、border 亮实色）、`--radius-*: 0`、shadow 全 none、`--font-mono` 可换（本期不引像素字体文件，用系统等宽，字体文件留待后续按需）

### 2.3 应用层

- main.tsx：启动读 `zd-theme`（迁移：旧 `zdashboard-theme` 的 'dark'/'light' 直接映射），`document.documentElement.dataset.theme = id`
- ThemeToggle 重写：DropdownMenu（shadcn，需 copy 该组件——@radix-ui/react-dropdown-menu 依赖）+ 每项 swatch 四色块 + 选中 check；切换写 `zd-theme` + dataset

## Phase 3 验收

- **硬标准：`[data-theme="pixel"]` 仅存在于 globals.css，git grep 确认零 tsx 改动参与 pixel 实现**
- 三主题 × 主路径走查：首页/view/design/bugs/review/apply/just 无漏色（emerald 残留=漏）、胶囊变方、阴影消失
- 旧用户升级：原 dark 用户无缝（迁移逻辑）；build+vitest+tsc 全绿

## 明确不做

- 像素中文字体文件（体积大，后续按需）
- 主题热切换动画、主题导出/导入
- 半透明/动效的主题化改造（保留区，见 1.3）
