# ui-shell Specification

## Purpose
约束 dashboard Shell 的内容区结构：无论接入多少插件（内置或外部），外观容器由 Shell 结构性提供，不依赖插件自觉。

## Requirements

### Requirement: Content 槽结构性容器

Shell 的内容区 SHALL 结构性提供统一容器：点点背景（radial-gradient 点阵）+ 均匀留白（padding），插件 Workspace 组件只负责居中卡片内容，不得也不需要自带背景容器。任何插件（内置/外部 iframe）进入后外观一致。

#### Scenario: 新插件零样式获得一致外观

- **WHEN** 新增一个只渲染裸 `<table>` 的内置插件，或外部 iframe 插件
- **THEN** 其内容呈现在点点背景 + 留白的统一容器中，与既有工作区外观一致

#### Scenario: 卡片宽度由内容声明

- **WHEN** 表格类工作区需要更宽的卡片
- **THEN** 插件可声明更宽的最大宽度（如 72rem），容器不限制卡片自身宽度选择

### Requirement: Sidebar 槽与折叠

插件契约 SHALL 提供可选 Sidebar 槽（web.tsx 的 `Sidebar` lazy 导出）。Shell 渲染侧栏框架：折叠 chevron 按钮、按 mode 记忆开合状态（localStorage）、折叠后保留边缘热区悬停临时展开（移开即收，不改状态）。

#### Scenario: 折叠与记忆

- **WHEN** 用户在 view 工作区折叠文件树后切换到 design 再切回
- **THEN** view 的侧栏保持折叠状态（按 mode 记忆），design 的侧栏状态独立

#### Scenario: 悬停临时展开

- **WHEN** 侧栏处于折叠态，鼠标悬停到保留的边缘热区
- **THEN** 侧栏临时滑出展示，鼠标移开后收回，折叠状态本身不变
