# 设计:writeRecord 保留 plugins 段

## 现有系统分析

- `src/core/instance.ts:41-50` `writeRecord(root, port)`：构造全新 `InstanceRecord{pid,port,root,startedAt}` 直接写盘，**不读旧记录** → `plugins` 段丢失
- 调用点：`cli.ts` `onListen: (port) => writeRecord(root, port)`，每次监听成功触发
- `readPluginsConfig(root)` 从记录读 `plugins` 段；`writePluginsConfig` 读旧记录再整体写回（已有读改写语义）——只有 `writeRecord` 是盲写
- 同文件 `stripLegacyViewConfig`（view change 新增）已在启动时清理死键，但先于 `onListen` 执行，收益被 writeRecord 抹掉

## 方案设计

### 方案 A：读改写保留合并（选定）

`writeRecord` 改为：先 `readRecord(root)`（容错），存在则沿用其 `plugins` 字段（`rec.plugins` 原样并入新记录）；不存在/损坏则维持现状最小记录。写盘保持 tmp+rename 原子模式（对齐 `writePluginsConfig`）。

| 文件 | 改动 |
|------|------|
| `src/core/instance.ts` | `writeRecord` 读旧记录合并 `plugins`；写盘改 tmp+rename |
| `src/core/test/instance-strip.test.ts` 或新增 `writerecord.test.ts` | 4 分支单测（有段保留/无段不新增/损坏兜底/原子无残留） |

**不做**：不改 `InstanceRecord` 类型；不动 `stopInstance`/`clearRecord`；不动 cli 调用链。

**备选 B：onListen 延后/去重写**——被否：调用语义本该是「更新运行字段」，修数据保留才治本。

## 接口 / 数据契约

`writeRecord(root, port)` 签名不变；`.zdev/dashboard.json` 形状不变（`plugins` 段从「每次重启丢失」变「跨重启保留」）。

## 实施步骤

1. TDD：先写 4 分支失败测试
2. 实现 read-modify-write + tmp+rename
3. 全量回归（确认 instance-strip 测试仍绿）

## 风险与 Trade-off

- 风险：旧记录含损坏 `plugins` 段 → `readRecord` 已容错返回 null，走新建路径，无新增风险
- 开放问题：无

## 测试策略

- **单元**：4 分支（有 plugins 保留且 pid/port 更新；无 plugins 不新增键；损坏 JSON 兜底新建；tmp 文件无残留）
- **回归**：`pnpm typecheck && pnpm test` 全绿；instance-strip 全部用例不回归
