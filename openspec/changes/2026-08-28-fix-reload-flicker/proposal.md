## Why

面板「一闪一闪」:`reload.ts` watcher 对任何被 watch 的文件变更同时广播 `'reload'` + `'files'`,而 `App.tsx:31` 的 `onReload` 回调是 **`window.location.reload()` 整页刷新**——文件一变,整页白屏一闪。smooth-reload change 已把数据刷新下沉到插件级(`usePluginData` 订阅 `'files'` 静默 refetch),INJECT 脚本也早已去整页 reload,App 这处是漏改残留。

放大器:①Windows `fs.watch recursive` 会发 `filename: null` 事件,现有 `if (filename && ...)` 守卫全部放行,噪音事件也触发广播;②真实项目里 zapply batch 每次 checkpoint 写 `runs/<runId>/state.json`、常驻服务持续写 `.log`,面板开着就周期性闪屏。日志文件变更对 just 插件无意义(其日志走独立 `/__just/logs` SSE),对其他插件是纯噪音。

## What Changes

- `src/web/App.tsx`:`onReload` 回调改 no-op(数据刷新由插件级 `'files'` 订阅承担,移除整页 reload)
- `src/core/reload.ts`:watcher 忽略正则追加 `.log` 后缀;其余行为不变(null filename 仍视为变更,广播代价降为插件 refetch,不再闪屏)

## 成功标准

1. 文件变更(含 `.zdev` 下状态写入、`.log` 持续写入)后面板**不整页刷新**,数据静默更新:view 树、设计资产、apply 批量进度在 SSE `'files'` 到达后各自 refetch
2. `.log` 文件写入不触发广播
3. `pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)

## 依赖

无前置。

## 优先级

- P1：核心体验缺陷,面板在活跃项目(有 batch/服务写文件)下基本不可用。
