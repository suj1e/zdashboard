## Purpose

项目统计内置插件：扫描目标项目生成统计视图，作为插件平台的第一屏演示。

## ADDED Requirements

### Requirement: 项目统计工作区

系统 SHALL 内置 stats 插件：后端扫描目标项目（文件/目录数、总大小、Markdown 数、openspec 进行中与归档变更数、justfile 存在性、文件类型 Top N），经 `/__stats/data` 提供；前端以卡片网格 + 条形图渲染；侧边栏排序位于 view 之前（第一个插件位）。

#### Scenario: 统计数据展示

- **WHEN** 进入 stats 工作区
- **THEN** 展示文件/目录/大小/Markdown/变更卡片与文件类型 Top10 条形图，数据来自实时扫描

#### Scenario: 热刷新

- **WHEN** 目标项目文件发生变化
- **THEN** 统计视图随 SSE reload 自动刷新
