## ADDED Requirements

### Requirement: 静态服务与渲染健壮性

静态资产服务 SHALL 支持 HTTP Range 请求（206/Content-Range/Accept-Ranges）并覆盖音视频 MIME，使视频/PDF 可拖动播放；前端 SHALL 不经 innerHTML 字符串拼接渲染不可信内容（token 预览以 React 元素渲染）；请求体读取 SHALL 统一共享实现并监听请求错误，客户端中断不悬挂。

#### Scenario: 视频 seek

- **WHEN** 对 mp4 资产发起 `Range: bytes=0-99` 请求
- **THEN** 返回 206 与 Content-Range，VideoViewer 进度条可拖动

#### Scenario: 中断不悬挂

- **WHEN** 客户端在 POST 途中断开连接
- **THEN** 服务端 readBody settle（空体），无未决 Promise
