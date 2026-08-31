## Why

数据新鲜度链路有两个反向缺陷（巡检报告 useSSE:23-31 / usePluginData:100）：①SSE 断线重连后**只补偿了 App 层的 onFiles，各插件频道订阅不失效**——断线期间的变更永久丢失，数据停在旧值且无提示；②后台刷新失败时 `setState({ data: null, error })` **把已有好数据整页清成错误态**。另外 view 核心路径两伤：正在预览的文件不随磁盘变更更新（viewer 不订阅 files）；切文件不重置滚动位置（长文件中部点短文件直接落在底部）。

## What Changes

- **重连补偿**：`useSSE` 的 `conn.onopen` wasLost 分支，除 `onFiles()` 外向所有已订阅频道逐个派发失效信号，`usePluginData` 各实例重取
- **保旧数据**：`usePluginData` 后台重取失败时保留 `data`，错误降级存入独立字段（UI 可选呈现轻提示），不清空
- **viewer 接 files**：MdViewer/CodeViewer（及 design viewers）订阅 SSE `files` 事件，命中当前 `path` 时重取；配合加手动刷新按钮
- **切文件重置滚动**：view/Workspace 的 `contentRef` 容器在 `file` 变化时 `scrollTop = 0`

## 成功标准

1. 断线→改文件→重连：侧栏/viewer 数据自动更新到最新
2. 重取遇瞬时 500：界面保留旧数据，不闪错误页
3. 预览文件在磁盘被修改后数秒内自动更新；有手动刷新按钮
4. 切文件后滚动位置回到顶部
5. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

- 前置:openspec/changes/2026-08-31-ux-error-states/（viewer 错误态渲染基建；重取失败降级提示复用其产物）

## 优先级

- P1：预览工具的信任根基——静默旧数据比报错更伤。
