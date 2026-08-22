## ADDED Requirements

### Requirement: 共享 UI 原语

前端 SHALL 复用共享组件而非复制实现：Markdown 渲染统一引用 web/viewers/MdViewer；badge 家族统一为 ui/badge 语义变体；目录遍历（walkDir）、进度条（ProgressBar）、筛选药丸（FilterPills）、任务清单解析（parseTasks）各提供单一共享实现供各插件引用。

#### Scenario: 渲染管线单一来源

- **WHEN** Markdown 渲染插件链（rehype/remark）调整
- **THEN** view/review/design 三处预览行为一致更新，无复制版本漂移

#### Scenario: badge 视觉一致

- **WHEN** 任一插件展示状态徽章
- **THEN** 使用统一 Badge 语义变体（success/warning/info/neutral/destructive）
