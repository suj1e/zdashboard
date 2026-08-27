# feat-remove-review-bugs-plugins

## Why
skill 侧裁剪定稿：zreview（zarchitect 覆盖其文档分析场景）与 zgoal（禅道闭环不再使用）两个 skill 已删除。dashboard 的 review 插件失去数据生产者；bugs 插件的凭据引导（`.zdev/config.yaml` 由 zgoal 创建）随之断供，均成孤儿功能。

## What Changes
- 删除 `src/plugins/review/`、`src/plugins/bugs/`
- 删除 `src/server/review-store.ts`、`src/server/bugs.ts`（仅被上述两插件引用）
- cli.ts：移除两插件 import/注册、`migrateLegacyBugsConfig()` 及其 `yaml` 依赖
- 作废未提交的 change feat-zdev-contract-paths（.zdev/review 迁移目标已不存在）
- 保留：view / stats / apply / apply-batch / design / just 插件

## 验收标准
- grep 全 src 无 review-store / plugins/bugs / plugins/review 引用
- pnpm build 通过
