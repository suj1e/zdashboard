# 设计:apply 批量页加固与宽度统一

> 快车道:四项均为小改,已对照 zskills 0.6.0 审计定性;合计约 60 行 + 测试。

## 现有系统分析

- 宽度:`SingleChangeView.tsx:182` 外层 `mx-auto h-full max-w-6xl`;BatchView 无限宽 → 不一致。
- 空态文案:`BatchView.tsx:74` 旧数据提示行。
- 读取器:`batch.ts readBatchState(root)` 只认 CURRENT;`projectGraph(state)` 无字段防御(`state.changes.map`、`conflicts: state.conflicts`);`tailLogs` 已防御(`state?.logs ?? []`)。
- 路由:`apply/index.ts` 的 `/__apply/batch|batch/graph|batch/logs|batch/plan` 均固定调 `readBatchState(root)`。
- zskills 0.6.0 schema:必填 = version/status/changes/batches/currentBatchIndex/parallelism/logs/updatedAt;**conflicts 可选**;新增可选 `front`(战线别名);并行战线时 CURRENT 只指焦点,其余 run 显式 runId 寻址。

## 方案设计

### 1. 宽度统一
`SingleChangeView.tsx:182` 去 `mx-auto max-w-6xl` → `h-full flex flex-col ...`(与 BatchView 同为撑满)。

### 2. 删提示行
`BatchView.tsx:74` 旧数据提示行整行删除。

### 3. 字段容忍(batch.ts)
- `projectGraph`:`changes: Array.isArray(state.changes) ? state.changes.map(c => ({ name: c.name, status: c.status, dependencies: Array.isArray(c.dependencies) ? c.dependencies : [], batchIndex: c.batchIndex })) : []`;`batches: Array.isArray(state.batches) ? state.batches : []`;`conflicts: Array.isArray(state.conflicts) ? state.conflicts : []`。
- BatchView 概览条 counts:`(Array.isArray(state?.changes) ? state?.changes : [])` 收敛为一个 `changes` 局部变量再统计。
- 日志 `tailLogs` 已防御,不动。

### 4. 多战线寻址
- `batch.ts`:`readBatchState(root, explicitRun?: string)`——`explicitRun` 先过同一 `RUN_ID_PATTERN`,非法则**忽略回退 CURRENT**;合法则跳过 CURRENT 直接读 `runs/<runId>/state.json`(缺失/损坏 → 既有 `{run:{id},state:null}` 语义)。
- `view/manifest.ts` params 增 `{ name: 'run', label: 'Run ID', type: 'string', description: '显式 runId(多战线时寻址),缺省读 CURRENT' }`。
- `apply/index.ts` 四条 batch 路由从 query 取 `run` 传入 `readBatchState(root, run)`;plan 路由同理(显式 run 的 plan.md)。
- `BatchView.tsx`:概览条 `run:` 后展示 `state.front ?? ''`(非空才显示,与 runId 并列 chip);URL `run` 参数经既有 route.navigate 支持(左侧列表/Tab 切换不清理该参数——navigate patch 语义天然保留)。

## 接口 / 数据契约

- `GET /__apply/batch?run=<runId>`(graph/logs 同理):显式 run 覆盖;响应形状不变。
- URL 契约新增 `run`(view ParamSchema)。
- localStorage/存储零变更。

## 实施步骤

1. 宽度 + 删文案(两行)+ 组件断言同步(若既有测试断言限宽类则更新)。
2. batch.ts 字段容忍 + 单测(三分支)。
3. run 寻址:batch.ts override + manifest params + index.ts 路由 + BatchView front 展示 + 组件测试(override 生效/非法回退/front 渲染)。
4. 回归:typecheck/test/build 全绿 + 手工冒烟(宽度一致、空态文案、`?p=apply&view=batch&run=<历史runId>` 直达、无 run 参数回退 CURRENT)。

## 风险与 Trade-off

- 显式 run 指向终态/历史 run:与 CURRENT 指向历史 run 同语义(只读快照),不额外拦截。
- `run` 参数非法静默回退 CURRENT(而非报错):查看器语义,宽容优于报错;测试钉住。
- 概览条 front 与 runId 并排可能过长:front 用 Chip 截断 + title。

## 测试策略

1. **单元(batch.test.ts)**:
   - 字段容忍:state 缺 conflicts / 缺 changes / changes 非数组 / change.dependencies 非数组 → projectGraph 三数组形状正确不抛错。
   - run 寻址:合法显式 runId 读对应文件;非法字符回退 CURRENT;显式 run 文件缺失 → `{run:{id},state:null}`;无参数走 CURRENT。
2. **组件**:
   - BatchView:`?run=` 时 URL→路由链路(mock server 断言收到 run query);front 非空展示/缺失不渲染;概览条在 state.changes 缺失时不崩(渲染 0 计数)。
   - SingleChangeView:容器无限宽类(与 BatchView 对称断言)。
3. **手工冒烟**:两 Tab 切换宽度稳定;空态无旧文案;构造 legacy run 目录用 `?run=` 直达;CURRENT 缺失时页面不崩。
4. **回归**:基线 45 文件 343/343 + typecheck + build。

## 上线与人工动作

- 无。
