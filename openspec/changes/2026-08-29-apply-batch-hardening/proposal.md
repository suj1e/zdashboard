# 提案:apply 批量页加固与宽度统一(2026-08-29-apply-batch-hardening)

## 需求复述

用户 2026-08-29 反馈四点(apply 页面,v2.8.2):

1. **两 Tab 内容区宽度不一致**:SingleChangeView 外层 `max-w-6xl`(限宽居中),BatchView 撑满——切换时宽度跳变。
2. **旧 `.zapply/batch-state.json` 提示冗余**:空态文案提旧数据「不迁移,仅留档」,用户明确表示旧的不管、提示也不要。
3. **批量读取字段容忍不彻底**(对照 zskills 0.6.0 batch-state.schema.json 审计发现):schema 必填字段**不含 `conflicts`**,而 `projectGraph()` 直接 `state.changes.map` / `conflicts: state.conflicts` 不设防;概览条 `state?.changes.filter` 在 changes 缺失时同样会崩。batch.ts 注释承诺「字段级结构由消费方容忍」但消费方未兑现。
4. **多战线寻址缺失**(zskills 0.6.0 新语义):并行新战线时 CURRENT 只指焦点 run,新战线用显式 runId 寻址,且 state.json 新增 `front`(战线别名)——批量页目前只能看 CURRENT 指向的 run,`front` 不展示。

用户决策:1/2/3/4 全修;旧数据本身不迁移。

## 要解决的问题

- 视觉一致性(宽度跳变)。
- 文案噪音(用户不需要的解释)。
- 外部写入者(zapply)按 0.6.0 schema 省略可选字段时的前端崩溃面。
- 多战线并行时非焦点 run 不可观测。

## 成功标准

1. Single/Batch 两 Tab 内容区均撑满主区(无 max-w-6xl),切换无宽度跳变。
2. 批量空态不再出现旧数据提示文案。
3. projectGraph 对 `changes/batches/conflicts` 缺失或非数组一律投影为空数组;概览条对 `state.changes` 缺失不崩;单元测试覆盖(缺 conflicts / 缺 changes / changes 非数组 三分支)。
4. `run` 成为 apply 插件 URL 参数(ParamSchema 声明);`/__apply/batch*` 路由支持 `?run=<runId>` 显式寻址(合法 pattern 才生效,非法回退 CURRENT;合法但缺失 → 既有 `{run:{id},state:null}` 语义);概览条展示 `runId` 与 `front`(缺失不显示);组件测试覆盖 override 生效/非法回退。
5. 基线 45 文件 343/343 + typecheck + build 不回归。

## 非目标

- 不做旧数据迁移(用户拍板:旧的不管)。
- 不做多 run 并列总览(一次仍只看一个 run,寻址入口解决 observability 即可)。

## 依赖

- 无前置(基于 main@2.8.2)。

## 优先级

- P2:3 是健壮性债务,1/2/4 是体验小项,合包一次交付。
