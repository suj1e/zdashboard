## MODIFIED Requirements

### Requirement: 插件清单与前端发现

系统 SHALL 提供 `GET /__plugins` 返回已注册插件清单（mode/label/icon/description）；前端 SHALL 以 `import.meta.glob('../plugins/*/web.tsx')` 发现内置插件并与 `/__plugins` 的外部清单合并展示。内置插件前端契约 SHALL 为 `{ mode, label, icon, description?, Sidebar?(lazy), Workspace(lazy) }`：Sidebar 槽可选（由 Shell 渲染框架与折叠交互），Workspace 只负责内容卡（容器背景由 Shell 结构性提供）。外部插件的 iframe viewer 自动获得同款结构化容器，无需修改。

#### Scenario: 内置插件零注册

- **WHEN** 开发者在 `src/plugins/<new>/` 添加 `index.ts`（后端）与 `web.tsx`（前端契约，含可选 Sidebar 槽）
- **THEN** 无需修改 App.tsx 或任何 core 代码，重启后新插件出现在 IconRail 与首页卡片，内容自动获得统一容器
