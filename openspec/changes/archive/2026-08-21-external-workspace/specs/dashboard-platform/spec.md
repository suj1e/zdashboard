# Dashboard Platform 能力规格（2.1）

## ADDED Requirements

### Requirement: 外部插件 Workspace（iframe）

系统 SHALL 支持外部插件向前端贡献可视化界面：外部插件目录下的 `web/` 子目录（含 index.html）自动服务在 `/__plugin/<目录名>/`；manifest 的 `viewerUrl` 字段声明同源查看地址，前端以 sandbox iframe 渲染；mode 与目录名一致且未显式声明 viewerUrl 时自动填充。

#### Scenario: web 目录自动服务与自动填充

- **WHEN** `--plugins ./ext` 且 `./ext/my-skill/web/index.html` 存在，插件 register 了 mode 为 `my-skill` 的 manifest
- **THEN** `GET /__plugin/my-skill/` 返回注入热刷新脚本的 HTML，`/__plugins` 中该条目带 `viewerUrl: '/__plugin/my-skill/'`，前端 `#my-skill` 直达渲染 iframe

#### Scenario: 显式 viewerUrl 优先

- **WHEN** manifest 显式声明 `viewerUrl`（如指向插件自身路由服务的页面）
- **THEN** 前端使用声明值渲染 iframe，自动填充不生效

#### Scenario: 无 web 目录保持占位

- **WHEN** 外部插件目录不含 `web/index.html`
- **THEN** 插件正常挂载、路由可达，前端显示占位工作区，不报错

#### Scenario: 前缀静态服务的路径防护

- **WHEN** 请求 `/__plugin/<name>/../` 之类试图越出插件 web 目录的路径
- **THEN** 返回 403/404，不泄露目录外文件
