## MODIFIED Requirements

### Requirement: 主题系统

系统 SHALL 以令牌驱动风格并支持多主题扩展：**语义色、字号、字体族、圆角、边框宽度、阴影、图标集** 全部经 CSS 变量或主题注册表定义；**明暗（data-mode: dark/light）与主题（data-theme）正交**；主题清单由注册表声明且 **id 为非联合字符串**（新增主题不改类型定义）。添加主题 SHALL 遵循 SOP：一个主题 CSS 文件（含该主题在 dark/light 两 mode 的取值）+ 一条注册表条目 + 可选图标映射表，**零组件代码改动**（组件 class 名、图标库引用、px 值等全部走变量/注册表）。Topbar 风格选择器 SHALL 用 lucide 图标并与状态同步（切换后选中态即时刷新）。

#### Scenario: 零组件改动换风格

- **WHEN** 新增一个风格（如 pixel：实色调板+全直角+无阴影+像素字体+放大字号）
- **THEN** 仅通过主题 CSS 文件覆盖变量与注册表条目实现，git diff 无任何 .tsx 变更（机制文件除外）

#### Scenario: 明暗正交

- **WHEN** 在 pixel 风格下切换明暗
- **THEN** 得到 pixel 的深底/浅底两套像素调色板，风格特征（直角/无阴影/点阵/VT323 字体/放大字号）保持不变

#### Scenario: 语义色跟随主题

- **WHEN** 组件展示成功/警告/信息状态（badge/状态点/提示）
- **THEN** 颜色来自语义令牌，切换主题自动变化，无 tailwind 调色板字面量残留（状态语义类）

#### Scenario: 主题选择与持久化

- **WHEN** 用户在 Topbar 主题选择器切换主题
- **THEN** 全站即时生效并持久化；重启后保持；旧版暗色用户升级后无感迁移

#### Scenario: 新增主题零 tsx

- **WHEN** 新增 Nord 主题（调色板式+自定义字号+图标集）
- **THEN** 仅新增 src/web/themes/nord.css 与一条注册表条目与图标映射表，git diff 无任何 .tsx 变更

#### Scenario: 字体与边框随主题

- **WHEN** 主题覆盖 --font-sans/--font-mono、--border-width、--radius-*、--text-*
- **THEN** 使用对应令牌的组件（font-family、border、rounded、font-size 类）自动跟随，无组件改类名

#### Scenario: 图标集随主题

- **WHEN** 主题注册表声明 iconSet 且组件通过 useIcons() hook 渲染图标
- **THEN** 切换主题后全部图标自动切换为对应风格（lucide / pixelarticons / 其他），无组件改 import

#### Scenario: 字号随主题

- **WHEN** 主题覆盖 --text-xs/--text-sm/--text-base/--text-lg 或 --text-10/--text-11
- **THEN** 使用对应字号类的组件自动跟随主题缩放，无组件改 px 值

#### Scenario: 主题切换即时反馈

- **WHEN** 用户在主题下拉选择 Nord
- **THEN** 菜单选中 Check 立即可见地更新至 Nord（React state 驱动），全站即时换肤并持久化
