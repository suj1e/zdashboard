## ADDED Requirements

### Requirement: 主题系统

系统 SHALL 以令牌驱动风格：语义色（success/warning/info/destructive）、圆角、阴影、点阵背景全部经 CSS 变量定义；主题经 `html[data-theme]` 切换（dark/light/pixel 内置），主题清单由注册表（themes.ts）声明；Topbar 提供主题选择器（含色板预览与持久化）。**新增一套主题 SHALL 仅需一个 CSS 变量覆盖块与注册表条目，不修改任何组件**。

#### Scenario: 零组件改动换主题

- **WHEN** 新增一个主题（如 pixel 风格：实色调板+全直角+无阴影）
- **THEN** 仅通过 globals.css 的 `[data-theme]` 覆盖块与 themes.ts 条目实现，git diff 无任何 .tsx 变更

#### Scenario: 语义色跟随主题

- **WHEN** 组件展示成功/警告/信息状态（badge/状态点/提示）
- **THEN** 颜色来自语义令牌，切换主题自动变化，无 tailwind 调色板字面量残留（状态语义类）

#### Scenario: 主题选择与持久化

- **WHEN** 用户在 Topbar 主题选择器切换主题
- **THEN** 全站即时生效并持久化；重启后保持；旧版暗色用户升级后无感迁移

## MODIFIED Requirements

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治（自带侧栏与内容）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。Topbar 右侧 SHALL 提供主题选择器（多主题下拉）。

#### Scenario: hash 直达

- **WHEN** 打开 `http://localhost:4190/#design`
- **THEN** 直接进入 design 插件工作区；切换插件时 hash 同步更新
