# 任务:apply 合并执行进度插件

- [x] 1. server:`src/plugins/apply/batch.ts` 只读读取器(CURRENT 解析 + runId 字符校验 + state.json 读取,null 空态语义)
  - 验收:单测四分支——无 CURRENT/非法 runId/JSON 损坏/正常读取
- [x] 2. server:注册 `/__apply/batch`、`/__apply/batch/graph`、`/__apply/batch/logs`、`/__apply/batch/plan` 只读路由;删 7 条 guardedRoute 写路由与 `throttle.ts`
  - 验收:curl 读路由返回约定形状;写路由 404
- [ ] 3. 删 `src/server/apply-batch-store.ts` + 测试;`ApplyBatchStore` 消费点清零
  - 验收:`grep -r "apply-batch-store" src/` 无结果
- [x] 4. web:`manifest.ts` 更新 description,params 增 `view`/`sel`;Workspace 改 Tab 壳(单 change｜批量驾驶舱,URL `view` param 读写)
  - 验收:组件测试:Tab 切换写 URL、直接带 `?p=apply&view=batch` 打开落在批量 Tab
- [x] 5. web:原 apply Workspace 内容迁 `SingleChangeView.tsx`(回归不变);apply-batch viewers 迁入裁剪为 `BatchView.tsx`(graph/checkpoint/logs 只读,ApprovalPanel 写控件删除、plan 只读展示或裁剪),订阅改 `files` 频道
  - 验收:单 change 视图现有测试迁移后全绿;批量视图空态引导文案渲染
- [ ] 6. 删 `src/plugins/apply-batch/` 整目录;确认 `?p=apply-batch` 回落首页
  - 验收:集成测试未知 mode 回落;IconRail 仅一个执行进度入口
- [ ] 7. playground mock `.zdev/apply/runs/` 三件套 + CURRENT,手验 Tab/graph/日志/plan
  - 验收:手工 checklist 过
- [ ] 8. 回归:`pnpm typecheck && pnpm test` 全绿
  - 验收:typecheck 0 error
