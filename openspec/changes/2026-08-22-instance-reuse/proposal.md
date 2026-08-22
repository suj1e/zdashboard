## Why

skills 每次 `npx zdashboard@latest --dir <项目根> --open` 都起新实例：同一项目反复用 skill 会不断重启 dashboard（端口顺延、越开越多）。要求：同目录已有活实例时复用，不再重启。

## What Changes

- 新增 `src/core/instance.ts`：实例记录文件 `<root>/.zdev/dashboard.json`（pid/port/root/startedAt）+ 双重存活校验（`process.kill(pid, 0)` 探活 + `GET /__config` 比对 root）+ 记录读写清理 + 旧实例停止
- `src/cli.ts`：创建 Context 之前 `findReusable`——活实例且无 `--restart` → 打开其 URL（尊重 `--page` hash）后 **exit 0**；`--restart` → 优雅停旧实例再起新的
- 实际端口回写：ServerService listen 成功回调里 `writeRecord`（端口可能顺延，不能用 args.port）
- 优雅退出补充（现有缺口顺手修）：SIGTERM/SIGINT handler 触发清理链（clearRecord + runner 清理 + 退出），`/__stop` 与 dispose 时 best-effort clearRecord
- `--restart` 停旧实例用轮询探活（SIGTERM → 每 100ms 探活最多 2s → 仍活 SIGKILL），替代裸 sleep
- test-server 加 `.gitignore`（防验收产生的 `.zdev/` 记录污染 fixture）

## Capabilities

### New Capabilities

- `instance-reuse`：同目录单实例复用（记录协议、双重校验、复用/重启语义、优雅退出）

### Modified Capabilities

- `dashboard-platform`：CLI 新增 `--restart`；HTTP 服务骨架补充「listen 成功后回写实例记录」「停止/信号时清理记录」
