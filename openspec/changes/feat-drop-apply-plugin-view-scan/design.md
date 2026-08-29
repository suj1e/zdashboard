# 设计:删除 apply 插件,view 扫描 .zdev/apply(feat-drop-apply-plugin-view-scan)

## 现有系统分析

### apply 插件资产(待删)
- `src/plugins/apply/`:index.ts / manifest.ts / builtin 壳经由 builtin.ts 注册 / Workspace.tsx(Tab 壳)/ SingleChangeView.tsx / BatchView.tsx / batch.ts(只读读取器)/ parse-tasks.ts / scan.ts / types.ts / filter.ts / viewers/{DependencyGraph,CheckpointViewer}.tsx / test/*(8 文件,含 flaky view-header)
- host 挂载点:`src/plugins/builtin.ts`(BUILTIN 数组)、`src/cli.ts`(cli 域 no-op 引用已无?v2.8.0 后 apply server 侧即插件自带)、vite 代理(vite.config.ts `/__apply` → 无需,server 路由随插件消失)、`web/lib/plugins.ts` glob 自动收集(删目录即消失)

### view 扫描链(待扩)
- `core/tree.ts`:`scanTree(scanRoot, [...CONVENTION_SCAN_DIRS])`,`CONVENTION_SCAN_DIRS = ['openspec','docs']`
- `spec-scan.ts scanTree`:按 scanDirs 逐目录 `walkDir(dirPath, { maxDepth: 4, ... })`;**walkDir 跳过一切点开头条目** → `.zdev/apply` 直接加入 scanDirs 会静默为空
- 结论:需要「显式列入 scanDirs 的目录允许点前缀」例外

## 方案设计

### A. 删除 apply 插件
- `git rm -r src/plugins/apply`
- `src/plugins/builtin.ts`:移除 apply 注册项
- host 测试清理:`web/test/App.test.tsx`、`router.test.tsx`、`usePluginData.test.tsx`、`lib/plugins.test.ts`、`lib/icons-modes.test.tsx`、`plugins/test/manifests.test.ts` 中 apply 相关用例/fixture 删除或改为其他插件(stub 插件优先,避免误伤既有覆盖)
- vite.config.ts:无 `/__apply` 代理(v2.8.0 起走同源)→ 确认即可
- `web/App.tsx`:`Detects`/nav 相关无 apply 专属逻辑,确认无引用残留

### B. view 扫描 .zdev/apply
- `walkDir` 增 opts:`allowDotDirs?: boolean`(true 时不跳过点前缀**目录**;点前缀文件与既有 skip 集合行为不变——最小例外,不放大扫描面)
- `spec-scan.ts`:`ScanTreeOptions` 增 `dotDirs?: string[]`(哪些 scanDirs 允许点前缀);`scanTree` 对命中的 dir 调 walkDir 时传 `allowDotDirs: true`;分组名仍用 dir 原名(`.zdev/apply (n)`)
- `core/tree.ts`:`CONVENTION_SCAN_DIRS` 增 `.zdev/apply`
- maxDepth 4 对 `.zdev/apply/runs/<runId>/state.json`(3 层)足够;`CURRENT` 文件同层可见

### C. 交互回归面
- `?p=apply` / `?p=apply-batch` 深链接:App 既有「非法 mode 回首页」逻辑承接,无需新增
- state.json 在 view 中以 JSON 预览(CodeViewer)消费;CURRENT 为纯文本

## 接口 / 数据契约

- 无新增;删除 `/__apply*` 路由族(随插件)。`/__files` 响应形状不变(tree 内容多一个分组)。

## 实施步骤

1. 删 `src/plugins/apply/` + builtin 注册项;typecheck 暴露残留引用逐一清理
2. host 测试清理(apply 用例删除/stub 化)
3. walkDir 点目录例外 + spec-scan dotDirs + tree.ts scanDirs 增 `.zdev/apply`;单测(dotDirs 例外生效/未列入的点目录仍跳过/maxDepth 行为)
4. 回归:全量 test/typecheck/build;playwright:IconRail 无 apply、`?p=apply` 回首页、view 树出现 `.zdev/apply` 且可预览 state.json/CURRENT/plan.md、ext-plugins demo/bare 正常、控制台零错误

## 风险与 Trade-off

- 批量可视化能力消失:用户拍板接受;git 历史可复活
- 点目录例外扩大扫描面:仅显式列入 dotDirs 的路径生效,`.git`/`node_modules` 等不受影响(walkDir 主循环仍默认跳过)
- host 测试中 apply fixture 承担的覆盖(如 router merge 语义)需转由 stub 插件承接,防覆盖缩水

## 测试策略

1. **单元**:
   - walkDir:allowDotDirs=true 时 `.zdev` 被遍历;false(缺省)跳过;文件点前缀始终跳过
   - scanTree:scanDirs 含 `.zdev/apply` 且 dotDirs 声明 → 分组出现且含 CURRENT/state.json;未声明 dotDirs 的同名目录 → 分组不出现
   - manifest 集成:plugins 列表无 apply
2. **组件/集成**:
   - App:未知 mode 回首页(现成用例参数化覆盖 apply 字符串)
   - plugins.test:注册表无 apply
3. **回归**:全量 test/typecheck/build;playwright 冒烟(成功标准 3/5)
4. **测试数据**:playground `.zdev/apply/` 已有真实 run(2026-08-28-2128 等),直接作为扫描样本

## 上线与人工动作

- 无。
