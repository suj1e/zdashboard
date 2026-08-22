# Design: 同目录单实例复用

基于分支 `2026-08-22-ui-shell-structure`（含 Shell 双槽结构与 v2.0 现状：CLI `--dir/--port/--open/--page/--plugins`、`/__config` 已返回 `{stopToken, version, root}`、ServerService 绑 127.0.0.1 且 EADDRINUSE 端口顺延、listen 回调里执行 `--open` 且拼 `#page` hash）。

## 记录文件协议

`<root>/.zdev/dashboard.json`（运行时状态；`.zdev/` 是 skill 生态既有 gitignore 约定）：

```json
{ "pid": 12345, "port": 4190, "root": "/abs/path/to/project", "startedAt": "ISO-8601" }
```

## 1. `src/core/instance.ts`（纯函数模块，非 cordis 服务）

```ts
interface InstanceRecord { pid: number; port: number; root: string; startedAt: string }
const RECORD_FILE = '.zdev/dashboard.json';
const VERIFY_TIMEOUT_MS = 1500;

readRecord(root): InstanceRecord | null      // 缺失/JSON 损坏/字段不全 → null（不抛）
isAlive(pid): boolean                        // process.kill(pid, 0)；ESRCH=死，其他(含 EPERM)=活
verifyRoot(port, root): Promise<boolean>     // fetch http://127.0.0.1:<port>/__config，AbortSignal.timeout(VERIFY_TIMEOUT_MS)
                                             // 超时/拒连/非 200/解析失败/无 root 字段/root 不匹配 → 一律 false（判死）
findReusable(root): Promise<InstanceRecord | null>  // readRecord + pid 活 + verifyRoot 全过才返回记录，否则 null
writeRecord(root, port): void                // mkdir -p .zdev 后写（pid=process.pid）
clearRecord(root): void                      // best-effort 删文件
stopInstance(record): Promise<void>          // SIGTERM → 每 100ms isAlive 轮询，最多 STOP_POLL_MS(2000) → 仍活 SIGKILL → 再等 100ms
```

fetch 用 Node 全局 fetch + `AbortSignal.timeout`（Node 20 环境）；注意此处是真实 HTTP 请求（绝对 URL `http://127.0.0.1:<port>/__config`），不是浏览器相对路径。

## 2. `src/cli.ts` 接线

parseArgs 增加 `restart: boolean`。**创建 Context 之前**：

```ts
const record = await findReusable(root);
if (record && !args.restart) {
  const u = `http://localhost:${record.port}` + (args.page ? `#${args.page}` : '');
  if (args.open) exec(open 命令, u);            // 复用 open 机制（darwin=open / win=start），尊重 --page hash
  console.log(`[zdashboard] 已复用实例 ${u}${args.restart ? '' : '（--restart 可强制重开）'}`);
  process.exit(0);                              // 必须 exit 0——skills 把非零当失败
}
if (record && args.restart) {
  console.log(`[zdashboard] --restart：停止旧实例 pid=${record.pid}`);
  await stopInstance(record);
}
```

起新实例后：**实际端口回写在 ServerService 的 listen 成功回调里**（那里同时拿得到 root 与最终 port；EADDRINUSE 顺延后回调只在最终成功那次触发）。方式：ServerService 增加可选 `onListen?: (port: number) => void` 配置项，cli 传入 `(port) => writeRecord(root, port)`——避免 core 反向 import instance.ts 造成耦合。

## 3. 优雅退出（顺手修现有 Ctrl+C 缺口）

- cli.ts 末尾注册：
  ```ts
  const shutdown = () => { clearRecordSafe(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  ```
  （clearRecord 失败无害；just 子进程清理由 cordis dispose 链负责——若信号下无法走完整链，至少记录被清，下次启动自愈）
- `ServerService.stop()`（/__stop 路径）：res.end 后 `clearRecord(root)` 再走现有 50ms dispose+exit
- `ServerService.dispose()`：best-effort `clearRecord(root)`
- 双重校验保证任何残留（SIGKILL/断电没清到）都在下次启动时被当过期处理——**清理是优化不是正确性依赖**

## 4. 并发语义

同目录并发双启：两个进程都 findReusable=null → 都起 → 端口顺延 → 都写记录 → **最后写者赢**。落败实例成活孤儿但记录不指向它，不影响后续复用；不实现"落后者自杀"（复杂度不值）。

## 5. test-server fixture

`test-server/.gitignore` 增加 `.zdev/`（验收会在 fixture 目录产生记录文件）。

## 明确不做

- 跨目录全局实例注册表（各自 .zdev 天然隔离）
- "落后者自杀"、记录文件锁（flock）
- 不 push、不发版（版本号由用户定）

## 验收（7 条）

1. 起实例 A（port 4190）→ 同目录再跑 → **复用**：不开新进程、浏览器打开同端口、exit 0、日志含"已复用实例"
2. kill 掉 A → 再跑 → 起新实例（端口可用则回到 4190），记录被覆盖
3. 手动写坏 `.zdev/dashboard.json`（乱 JSON / 缺字段）→ 再跑不崩，当过期处理
4. `--restart` → 旧实例被优雅停止（SIGTERM 链），新实例起来，记录更新
5. 不同目录两个项目互不影响（各自 .zdev 各自复用）
6. 原有行为不回归：--port/--open/--page/--plugins 照常；并发双启端口顺延不崩（最后写者赢）
7. 复用路径 `--open --page view` → 打开的是活实例端口 + `#view` hash
