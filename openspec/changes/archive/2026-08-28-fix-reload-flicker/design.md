# 设计:reload 闪烁修复

## 现有系统分析

- `src/web/App.tsx:31-33`:`useSSE(() => { window.location.reload(); }, () => {})`——`'reload'` 事件整页刷新
- `src/web/hooks/useSSE.ts`:模块级单例,onReload/onFiles 分发到订阅者
- `src/core/reload.ts:33-37`:watcher 过滤 `.git|node_modules|dist|.pnpm` 前缀与临时文件,但 `filename` 为 null 时全放行;每次变更 debounce 300ms 后同时 broadcast `'reload'` + `'files'`
- 插件数据面:`usePluginData` 订阅 `'files'`(或插件频道)静默 refetch——App 整页 reload 是历史残留,与其重叠且体验劣化

## 方案设计

### 方案 A:去整页 reload + 忽略 .log(选定)

| 文件 | 改动 |
|------|------|
| `src/web/App.tsx` | `onReload` 改 no-op;`status` 返回值消费不变 |
| `src/core/reload.ts` | 忽略正则追加 `|\.(?:log)$` |

**不做**:
- 不合并 `'reload'`/`'files'` 两个事件(外部插件可能监听 `'reload'`,保持广播兼容)
- 不改 null-filename 放行行为(平台差异下贸然忽略可能漏真变更;修复后广播代价仅为 refetch)
- 不动 INJECT 脚本(已无整页 reload)
- 不动 `refreshGitInfo()`(watch 回调里的 git 刷新与闪烁无关)

**备选 B:onReload 改为触发各插件 refetch 的自定义事件**——被否:`'files'` 已承担,双通道徒增复杂。

## 接口 / 数据契约

SSE 事件协议不变(`/__reload` 的 `reload`/`files`/`config` 及 `plugin:*` 频道)。

## 实施步骤

1. TDD:App 组件测试断言 `'reload'` 事件到达后**未调用** `window.location.reload`(现红);watcher 忽略逻辑为纯函数化正则,补 `.log` 用例
2. 实现两处修改至绿
3. 回归 + playground 手验(touch 文件后面板不闪、数据更新)

## 风险与 Trade-off

- 风险:外部插件若依赖「'reload' 后宿主整页刷新」的旧行为获取全量重置——核查 playground ext-plugins 仅消费 `zd:*` postMessage 协议,不受影响
- 开放问题:无

## 测试策略

- **单元**:`reload.ts` 忽略正则——`.log` 命中/`logs/` 目录下 `.log` 命中/`.log.ts` 不误伤/(现有 tmp 等用例不回归)
- **组件**:App 渲染后派发 `'reload'` SSE 事件,断言 `window.location.reload` 未被调用;派发 `'files'` 同样不整页刷新
- **回归**:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)
