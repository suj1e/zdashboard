## MODIFIED Requirements

### Requirement: 主题系统

系统 SHALL 以令牌驱动风格并支持多主题扩展：语义色、圆角、阴影、**字体（--font-sans/--font-mono）、边框宽度（--border-width）** 全部经 CSS 变量定义；**明暗（data-mode: dark/light）与主题（data-theme）正交**；主题清单由注册表声明且 **id 为非联合字符串**（新增主题不改类型定义）。添加主题 SHALL 遵循 SOP：一个主题 CSS 文件（含该主题在 dark/light 两 mode 的取值）+ 一条注册表条目，零组件代码改动（图标类主题额外提供一张图标映射表）。Topbar 风格选择器 SHALL 用 lucide 图标并与状态同步（切换后选中态即时刷新）。

#### Scenario: 零组件改动换风格

- **WHEN** 新增一个风格（如 pixel：实色调板+全直角+无阴影）
- **THEN** 仅通过 globals.css 的 `[data-theme]` 覆盖块与注册表条目实现，git diff 无任何 .tsx 变更（风格选择器等机制文件除外）

#### Scenario: 明暗正交

- **WHEN** 在 pixel 风格下切换明暗
- **THEN** 得到 pixel 的深底/浅底两套像素调色板，风格特征（直角/无阴影/点阵）保持不变

#### Scenario: 语义色跟随主题

- **WHEN** 组件展示成功/警告/信息状态（badge/状态点/提示）
- **THEN** 颜色来自语义令牌，切换主题自动变化，无 tailwind 调色板字面量残留（状态语义类）

#### Scenario: 主题选择与持久化

- **WHEN** 用户在 Topbar 主题选择器切换主题
- **THEN** 全站即时生效并持久化；重启后保持；旧版暗色用户升级后无感迁移

#### Scenario: 新增主题零 tsx

- **WHEN** 新增 Nord 主题（调色板式）
- **THEN** 仅新增 src/web/themes/nord.css 与一条注册表条目，git diff 无任何 .tsx 变更

#### Scenario: 字体与边框随主题

- **WHEN** 主题覆盖 --font-mono 或 --border-width
- **THEN** 使用 font-mono 类的组件（14 处）与 border 类（全站）自动跟随，无组件改类名

#### Scenario: 主题切换即时反馈

- **WHEN** 用户在主题下拉选择 Nord
- **THEN** 菜单选中 Check 立即可见地更新至 Nord（React state 驱动），全站即时换肤并持久化
