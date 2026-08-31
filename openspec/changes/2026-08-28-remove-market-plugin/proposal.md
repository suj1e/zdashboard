## Why

market（灵感市场）插件经实际使用确认不需要：三市场浏览（Logo/CSS 动效/设计灵感）与「转提示词」闭环没有进入日常动线，却持续占用 IconRail 一格、注册表维护面（manifest 契约测试/图标映射）与一个含外部白名单代理的 server 攻击面（`/__market/proxy`）。保留无收益、删除零功能损失。

## What Changes

- 删除 `src/plugins/market/` 整目录（25 文件：sources/tabs/PromptPanel/tests 等）
- `src/cli.ts`：去 import 与 BUILTIN_PLUGINS 注册项
- `src/plugins/test/manifests.test.ts`：去 market 契约行与断言
- `src/web/lib/icons.tsx`：去 `market` 模式图标映射
- spec 同步：dashboard-platform **REMOVED**「灵感市场插件」requirement（含 4 个 scenario）
- README 若有 market 段落一并清理

## 成功标准

1. `grep -ri market src/ --include="*.ts" --include="*.tsx"` 零命中（测试断言内对已删模式的引用除外，应为零）
2. IconRail 剩余 4 个内置插件（stats/just/design/view，apply 已于 601171d 先行删除）全部保留；`?p=market` 未知 mode 回落首页
3. spec REMOVED delta 经 `openspec validate` 通过，归档后主 spec 不再含 market SHALL
4. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。

## 优先级

- P2：减法清理，随下一批执行。
