## 1. 移除整页 Reload

- [ ] 1.1 `App.tsx` 的 `useSSE` `onReload` 从 `location.reload()` 改为 no-op
- [ ] 1.2 `server.ts` 的 `INJECT` 脚本移除 reload 监听，保留 link target 修正逻辑
- [ ] 1.3 `reload.ts` 移除 `broadcast('reload')`，只保留 `broadcast('files')`
- [ ] 1.4 验证保存任意文件后页面不再 F5，滚动位置保留

## 2. 补齐 Plugin 局部刷新

- [ ] 2.1 `view/Sidebar.tsx` 订阅 `files` 事件，`refreshKey++` 触发 re-fetch `/__files`
- [ ] 2.2 `design/Sidebar.tsx` 订阅 `files` 事件，`refreshKey++` 触发 re-fetch `/__design/assets`
- [ ] 2.3 `stats/Workspace.tsx` 订阅 `files` 事件，`refreshKey++` 触发 re-fetch `/__stats/data`
- [ ] 2.4 `bugs/Viewer.tsx` 订阅 `files` 事件，`refreshKey++` 触发 re-fetch `/__bugs`
- [ ] 2.5 验证每个 plugin 在文件变更后数据原地更新，不依赖整页刷新

## 3. Review / Apply 乐观更新

- [ ] 3.1 封装 `optimisticUpdate(localPatch, serverPromise)` 工具函数
- [ ] 3.2 `ReviewViewer.tsx` 的 `post()` 改为乐观更新：先改本地 `data.items`，再 POST，失败回滚
- [ ] 3.3 `ReviewViewer.tsx` 的 `DecompositionNode` 新增/删除 child 改为乐观更新
- [ ] 3.4 `ApplyViewer.tsx` 的 task checkbox 改为乐观更新：勾选后立即更新进度，后台同步
- [ ] 3.5 验证 review/apply 操作后 UI 立即响应，失败时回滚并显示 toast

## 4. 文件树增量 Diff 更新

- [ ] 4.1 实现 `diffTree(oldTree, newTree)` 工具函数，返回 `{ added, removed, unchanged }`
- [ ] 4.2 `view/Sidebar.tsx` 的 TreeDir 根据 diff 结果应用 `animate-in`/`animate-out`
- [ ] 4.3 保留展开/折叠状态，未变节点保持原位
- [ ] 4.4 验证新建/删除文件时树平滑过渡，不白屏

## 5. SSE 静默重连

- [ ] 5.1 `useSSE.ts` 去掉手动 `setTimeout(connect, 1500)`，让 EventSource 原生重连生效
- [ ] 5.2 重连成功后静默 `refreshKey++`，各 plugin 主动拉取最新数据
- [ ] 5.3 去掉 StatusBar 红色断开状态，改为静默重试
- [ ] 5.4 验证断线重连期间用户操作无阻塞，重连后数据自动恢复

## 6. fs.watch 策略优化

- [ ] 6.1 `reload.ts` 增加临时文件过滤：`.swp`, `.tmp`, `~` 后缀, `.DS_Store`, `Thumbs.db`
- [ ] 6.2 debounce 从 150ms 提升到 300ms
- [ ] 6.3 `timer` 在回调结束后置为 `null`
- [ ] 6.4 验证 IDE 批量保存只触发一次刷新，临时文件不触发刷新
