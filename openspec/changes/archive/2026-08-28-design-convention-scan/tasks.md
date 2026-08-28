# 任务:design 约定化扫描

- [x] 1. `design/index.ts` 恒扫 `<root>/.zdev/design`，缺失→`emptyScan()`
  - 验收:单测:目录缺失返回九组空数组；存在时仅含该目录扫描结果
- [x] 2. `design/Sidebar.tsx` 删配置区与 `usePluginConfig`；`usePluginData` 订阅改 `files` 频道
  - 验收:组件测试断言无「配置」按钮；资产行渲染回归通过
- [x] 3. `design/manifest.ts` 删 `config` 字段
  - 验收:`/__plugins/config` 中 design schema 为空
- [x] 4. 删孤儿:`ConfigField.tsx`、`usePluginConfig.ts`、`usePluginConfig.test.tsx`（前置 change 已合入时全仓库无引用）
  - 验收:`grep -r "ConfigField\|usePluginConfig" src/` 仅剩 core 基础设施
- [x] 5. 存储死键剥离泛化:内置插件未声明 config 的键加载即清；external 插件键保留
  - 验收:单测覆盖内置清除/外部保留/无声明不清除三分支
- [x] 6. 回归:`pnpm typecheck && pnpm test` 全绿;playground 手验 design 页无配置、资产正常展示
  - 验收:typecheck 0 error;手工 checklist 过
