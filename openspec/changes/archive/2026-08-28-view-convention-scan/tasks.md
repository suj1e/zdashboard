# 任务:view 约定化扫描

- [x] 1. `spec-scan.ts` 选项收敛:`ScanTreeOptions` 删 `hiddenDirs`/`showHidden`,仅留 `defaultExpandDepth`
  - 验收:单测覆盖「约定目录存在/缺失/深度固定/路径前缀」;`pnpm test src/server` 通过
- [x] 2. `core/tree.ts` 删 `getConfig('view')` 读取,`scanTree(scanRoot, ['openspec', 'docs'])` 写死约定
  - 验收:curl `/__files` 仅返回 openspec/docs 节点;worktree 参数行为不变
- [x] 3. `view/manifest.ts` 删 `config` 字段
  - 验收:`/__plugins/config` 返回的 view schema 为空对象
- [x] 4. `view/Sidebar.tsx` 删设置按钮、配置弹窗、`usePluginConfig`/draft/commitSave
  - 验收:组件测试断言无「配置」入口;树分组(当前分支+worktree)与过滤回归通过
- [x] 5. `dashboard.json` 加载时剥离 `plugins.view` 死键(启动一次性,tmp+rename 原子写)
  - 验收:单测:含残留键的记录加载后键消失且其余 plugins 配置保留
- [x] 6. 回归:`pnpm typecheck && pnpm test` 全绿;playground 手验 view 页无配置入口、树结构符合约定
  - 验收:typecheck 0 error;手工 checklist 过
