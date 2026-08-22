# Tasks: harden-fixes

- [x] 1.1 TokenViewer → JSX 渲染（配色/字体/其他三段 map），删 dangerouslySetInnerHTML
- [x] 1.2 readBody 共享 util + req error 监听（review 悬挂修复）；just/review 统一引用
- [x] 1.3 serveFile 补 Range（206/Content-Range/Accept-Ranges: bytes）+ MIME 补音视频
- [x] 1.4 build+vitest 全绿 + 冒烟（curl -H 'Range: bytes=0-99' 返回 206；%zz 等畸形仍安全；token 页渲染正常）
