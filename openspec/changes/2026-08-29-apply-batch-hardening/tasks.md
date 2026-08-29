# 任务:apply 批量页加固与宽度统一

- [ ] 1. 宽度统一 + 删文案:SingleChangeView 容器去 `mx-auto max-w-6xl`(撑满,与 BatchView 对称);BatchView 空态删「旧 .zapply/batch-state.json 历史数据不迁移,仅留档」行;既有测试断言同步
  - 验收:组件断言两视图容器均无限宽类;含旧文案的断言更新;测试先红后绿
- [ ] 2. batch.ts 字段容忍:projectGraph 对 changes/batches/conflicts 及每个 change.dependencies 缺失/非数组投影为空数组;BatchView 概览条统计收敛到防御后的 changes 局部变量
  - 验收:单测三分支(缺 conflicts/缺 changes/changes 非数组)不抛错且形状正确;概览条渲染 0 计数不崩
- [ ] 3. 多战线寻址:batch.ts `readBatchState(root, explicitRun?)`(非法 pattern 忽略回退 CURRENT,合法缺失 → {run:{id},state:null});view/manifest.ts params 增 `run`;apply/index.ts 四条 batch 路由透传 query.run;BatchView 概览条展示 `front`(非空才显示,Chip 截断+title)
  - 验收:单测(override 生效/非法回退/显式缺失);组件测试(mock 断言 run query 送达、front 渲染/缺失)
- [ ] 4. 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;手工:两 Tab 切换宽度稳定、空态无旧文案、`?p=apply&view=batch&run=<历史runId>` 直达、无 run 参数走 CURRENT、控制台零错误
  - 验收:全绿 + 冒烟 checklist 入报告
