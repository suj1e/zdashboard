# 设计:对齐 zskills 新约定

## 现有系统分析

- `src/web/App.tsx:44-48`：`?p=<未知 mode>` 回落首页（`known` 判定）——apply-batch 合并后命中此路径
- `src/plugins/apply/parse-tasks.ts`：`parseTasks`/`countTasks` 按 checkbox `- [ ]`/`- [x]` 统计,无 🔧[人工] 概念
- `src/plugins/apply/SingleChangeView.tsx`（迁移自原 Workspace）：消费 tasks 渲染进度条与任务列表
- zdash 文档（zskills 侧）声明 `#apply-batch` 为合法直达;zapply 约定 `🔧[人工]` 项不计完成度、单列「待人工」清单

## 方案设计

### 方案 A：兼容重定向 + 进度口径剔除（选定）

**改动清单**：

| 文件 | 改动 |
|------|------|
| `src/web/App.tsx` | 未知 mode 判定处：`requestedMode === 'apply-batch'` → `route.navigate({ p: 'apply', view: 'batch' }, { replace: true })`（一次性重定向,不渲染首页）;其余未知 mode 维持回落首页 |
| `src/plugins/apply/parse-tasks.ts` | `countTasks` 增对 `🔧[人工]` 前缀的识别:返回 `{ total, done, manual }`(manual = 人工条目数,不进 total/done);`parseTasks` 给条目加 `manual?: boolean` 标记 |
| `src/plugins/apply/SingleChangeView.tsx` | 进度条用剔除后的 total/done;`manual > 0` 时显示「待人工 x 项」徽标;人工条目在任务列表中弱化样式（如 muted + 🔧 图标/前缀保留） |
| 消费方核对 | `parseTasks`/`countTasks` 的其他调用点(如有)同步解构新返回形状 |

**不做**：不动批量驾驶舱（front 字段展示等 schema 落了再说）；不动 view/design/just/stats；不动 App 其余未知 mode 逻辑；不做 `#apply-batch` 之外的旧模式映射。

**备选 B：仅 zskills 侧改文档去掉 #apply-batch**——被否：旧书签/已发布文档在用户手里,dashboard 侧兼容是唯一可控修复点。

## 接口 / 数据契约

- URL：`?p=apply-batch` → 302 语义的前端 replace → `?p=apply&view=batch`
- `countTasks(tasks)` 返回形状扩展 `{ total, done, manual }`（调用方同步）

## 实施步骤

1. TDD：重定向测试（`?p=apply-batch` → navigate 调用断言）+ countTasks 人工条目三分支
2. 实现 App 重定向 + parse-tasks 口径 + SingleChangeView 展示
3. 回归 + playground 手验

## 风险与 Trade-off

- 风险：`🔧[人工]` 前缀匹配误伤（如正文提及）——只匹配 task 行首 `- [ ] 🔧[人工]`/`- [x] 🔧[人工]` 模式
- 开放问题：无

## 测试策略

- **单元**：`countTasks`——含人工未勾/人工已勾/无人工三分支,断言 total/done/manual
- **组件**：App 对 `?p=apply-batch` 触发 navigate({p:'apply',view:'batch'}) 且落点为批量 Tab；SingleChangeView 对含人工条目的 change 显示「待人工 x 项」且进度 100%（全勾非人工时）
- **回归**:`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）
