## Why

just 插件核心场景是盯日志，当前三连痛：①自动滚动无条件拽底——上翻读历史被每行新输出拽回（LogViewer:97-99）；②每行一个 SSE 事件渲染 + 索引 key（超 1000 行全表重渲）+ 每秒 forceTick 全量重渲，Maven 刷屏必卡；③启停操作 403/400 静默、按钮无 pending 态可连点误杀进程。另有两个高频缺口：日志无搜索/级别过滤；带参 recipe 启动必然失败且无传参入口（just-runner:62 解析后丢弃参数、:96 spawn 不传）。

## What Changes

- **滚动锚定**：监听容器 scroll，「距底 < 40px」才自动跟随；不在底部时显示「↓ N 行新输出」回底按钮
- **渲染合批**：SSE log 事件进缓冲，rAF/50ms 合批追加；行组件 `memo` + 单调递增序号 key；elapsed 计时局部化
- **搜索与过滤**：日志内搜索（高亮命中）+ 级别过滤 pills（复用 FilterPills，复用已有 levelClass 识别）
- **启停反馈**：start/stop/clear 请求检查 `res.ok`，非 2xx 读 body 弹 toast；点击后按钮 pending 禁用直到 state 事件到达
- **带参 recipe**：服务端解析 recipe 签名（`just --summary`/`--show` 保留参数清单），UI 启动带参 recipe 时弹出参数输入（动态字段），拼进 argv
- 顺带：日志行数截断后显示「1000+ 行」；`\r` 进度条输出按 `\r` 分段推送（前端行内回写）

## 成功标准

1. 上翻后新输出不拽底，回底按钮可见可点；滚到底部恢复自动跟随
2. 高频输出（模拟 100 行/s）下无感知卡顿，旧行不重渲
3. 搜索高亮命中、级别过滤即时生效
4. 非法 recipe / 缺参数启动：toast 报错不静默；合法启动按钮 pending 至 state 事件
5. 带参 recipe 从 UI 可完成传参启动
6. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/2026-08-31-ux-error-states/（fetch 门卫与 toast 约定复用）

## 优先级

- P1：just 插件核心场景排障体验。
