# 提案:view/design 支持 .excalidraw/.drawio 预览(feat-diagram-viewers)

## 需求复述

用户(2026-08-31):view 和 design 插件需要支持 `.excalidraw` 与 `.drawio` 文件预览。现状:两扩展名在 view 落到 UnsupportedViewer,design 的 categorize 返回 null 直接不入扫描。

## 要解决的问题

仓库里的架构图(Excalidraw 画布、drawio/diagrams.net 导出)在 dashboard 里只能看 JSON/XML 源码,无法可视化。

## 成功标准

1. view:预览 `.excalidraw` 文件出现 Excalidraw 只读画布(官方渲染);预览 `.drawio` 出现 drawio 官方 viewer 渲染(iframe)。
2. design:`.excalidraw`/`.drawio` 入扫描,归入新资产类型 `diagram`(侧栏「图表」分组),预览同上。
3. `@excalidraw/excalidraw` 为懒加载 chunk(仅预览该类文件时下载),不影响主包体积。
4. 渲染失败(文件损坏/网络)有错误态;drawio 离线时给「新窗口打开 diagrams.net」降级入口。
5. 基线测试全绿 + 新增路由/分类/渲染测试。

## 非目标

- 不做编辑与保存(只读预览)。
- 不做 .excalidraw→SVG/PNG 的服务端导出。
- 不支持 embed 场景加密链接(#json= 形态)。

## 依赖

- 无前置(基于 main@v2.12.1)。新增依赖:`@excalidraw/excalidraw`(框架级,主智能体已拍板:官方渲染器、React 同构、懒加载 chunk 限定影响面)。

## 优先级

- P2:架构图可视化是 dev dashboard 的核心场景。
