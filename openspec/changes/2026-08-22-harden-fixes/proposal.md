## Why

扫描发现 3 个真缺陷：design TokenViewer 拼 HTML 经 dangerouslySetInnerHTML 注入（全项目唯一 XSS 形态）；review 插件 readBody 缺 req error 监听（客户端中断时 Promise 永悬挂）；core 静态服务不支持 Range 请求（design 视频/PDF 拖动进度条失效）且 MIME 缺音视频格式。

## What Changes

- TokenViewer 改 React JSX 渲染（map 生成元素），regex 解析保留，消 dangerouslySetInnerHTML
- readBody 抽共享 util（src/core 或 server 公共处），review/just 两处统一，带 req error 监听
- 静态服务补 Range 支持（Accept-Ranges/206/Content-Range，Video/PDF 可 seek）；MIME 表补 .mp4/.webm/.mov/.avif/.m4a 等
- git porcelain 解析保持自写（评估结论：不换 simple-git）；just-runner/SSE 单例/pub-sub 保持（正面手搓）

## Capabilities

### Modified
- dashboard-platform：静态资产服务支持 Range；前端渲染无 innerHTML 注入
