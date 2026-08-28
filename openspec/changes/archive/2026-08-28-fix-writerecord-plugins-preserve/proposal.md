# 2026-08-28-fix-writerecord-plugins-preserve

writeRecord 重启时整体重写 dashboard.json 丢失 plugins 段,补保留合并

## 需求复述

`src/core/instance.ts` 的 `writeRecord(root, port)` 在每次实例监听成功后被 `cli.ts` 的 `onListen` 回调调用，**整体重写** `.zdev/dashboard.json` 且新记录不含 `plugins` 段——而 `plugins` 段承载插件配置中心存储（`readPluginsConfig`/`writePluginsConfig` 的数据源）。后果链：

1. 用户保存任意插件配置 → 写入 `plugins` 段
2. 任意原因重启 zdashboard（`--restart` / 手动重跑）→ `writeRecord` 覆写文件 → `plugins` 段丢失
3. 配置中心静默清零；`2026-08-28-view-convention-scan` 的 `stripLegacyViewConfig`（保留 design/just 段的清理逻辑）在真实启动链路中 cleaned 完即被抹掉，**无可观测收益**（code review 实证：strip 在 cli.ts 先执行，writeRecord 在 onListen 后执行）

## 要解决的问题

- `writeRecord` 读改写语义缺失：应保留既有记录中的 `plugins` 段（以及未来可能新增的其他段），只更新 pid/port/startedAt

## 成功标准

1. `writeRecord` 在已存在记录时保留原 `plugins` 段（不存在则维持无该段）；pid/port/startedAt 更新为本实例值
2. 记录损坏/缺失时行为与现状一致（新建最小记录）
3. 单测覆盖：有 plugins 段保留、无段不新增、损坏记录兜底、并发写沿用 tmp+rename 原子模式
4. `pnpm typecheck && pnpm test` 全绿；`2026-08-28-view-convention-scan` 的 instance-strip 测试不回归

## 依赖

无前置（独立小修，建议在本批归档后立即执行以兑现存储清理收益）。

## 优先级

- P1：本批两个约定化 change 的存储清理收益被它抵消，属功能性缺陷修复。
