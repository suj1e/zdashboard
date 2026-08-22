## ADDED Requirements

### Requirement: 主题系统

系统 SHALL 以令牌驱动风格：语义色（success/warning/info/destructive）、圆角、阴影、点阵背景全部经 CSS 变量定义。**明暗（data-mode: dark/light）与风格（data-theme: default/pixel/…）为正交维度**：明暗是每个风格都有的两态（太阳/月亮按钮切换），风格由独立选择器（Palette 下拉 + 色板预览 + 持久化）选择、清单由注册表声明。**新增一套风格 SHALL 仅需一个 CSS 变量覆盖块与注册表条目，不修改任何组件**。

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

## MODIFIED Requirements

### Requirement: 图标导航栏 + 工作区布局

前端 SHALL 采用「Topbar + 左侧 IconRail + 插件全屏工作区 + 底部 StatusBar」布局：IconRail 列首页与全部插件（active 高亮、tooltip 显示名称）；每个插件的 Workspace 完全自治（自带侧栏与内容）；首页为插件卡片网格 + 项目探测信息；StatusBar 显示地址、项目路径与 SSE 连接状态。Topbar 右侧 SHALL 提供明暗切换与独立的风格选择器（多风格下拉）。

#### Scenario: hash 直达

- **WHEN** 打开 `http://localhost:4190/#design`
- **THEN** 直接进入 design 插件工作区；切换插件时 hash 同步更新
