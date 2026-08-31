## REMOVED Requirements

### Requirement: 灵感市场插件

系统 SHALL 提供 `market` 插件(灵感市场),以三市场浏览开源设计资产:Logo(Simple Icons via CDN)、CSS 动效(animate.css/hover.css 等库)、设计灵感(内置精选站点目录);核心闭环为「转提示词」——按市场模板生成结构化提示词,经用户编辑后复制到剪贴板。

#### Scenario: 三市场浏览与搜索

- **WHEN** 用户打开 `?p=market` 并在三 Tab 间切换、输入搜索词或点选标签
- **THEN** 目录网格按前端过滤渲染,Tab/搜索/选中项承载于 URL params,刷新与深链接可还原

#### Scenario: 外部内容经白名单代理

- **WHEN** 插件请求外部资源
- **THEN** 仅 `cdn.jsdelivr.net` 与 `data.jsdelivr.com` 经 `/__market/proxy` 获取(带超时与内存缓存,响应头 X-Market-Cache);其他 host 一律 403,无任意 URL 转发

#### Scenario: 转提示词闭环

- **WHEN** 用户在某资产详情点击「转提示词」并编辑文本
- **THEN** 按市场模板生成含资产事实(SVG 源码/CSS 源码/元数据)的提示词,复制到剪贴板并有 toast 确认;最近 5 条可在插件内回看

#### Scenario: 断网降级

- **WHEN** 上游 CDN 不可达(代理 502/超时)
- **THEN** 内置目录仍可浏览,源码/图标区域显示错误与重试,提示词模板中不依赖在线内容的部分照常可用,页面不崩
