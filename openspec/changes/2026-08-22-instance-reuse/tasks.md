# Tasks: 同目录单实例复用

- [ ] 1.1 `src/core/instance.ts`：InstanceRecord 类型 + readRecord/writeRecord/clearRecord/isAlive/verifyRoot/findReusable/stopInstance（常量 RECORD_FILE/VERIFY_TIMEOUT_MS/STOP_POLL_MS；verifyRoot 四类失败一律 false；stopInstance 轮询探活 SIGTERM→SIGKILL）
- [ ] 1.2 `src/cli.ts`：parseArgs 加 --restart；创建 Context 前 findReusable 分支（复用 → 打开 URL 拼 #page → exit 0；--restart → stopInstance）；信号 handler（SIGTERM/SIGINT → clearRecord + exit）
- [ ] 1.3 `src/core/server.ts`：ServerOptions 加可选 onListen 回调，listen 成功回调里调用；stop()/dispose() 各加 best-effort clearRecord（经 onListen 之外的轻量方式：ServerService 自己 import clearRecord）
- [ ] 1.4 `test-server/.gitignore` 加 `.zdev/`
- [ ] 1.5 验收 7 条逐条真跑（复用/kill 后重启/坏记录/--restart/双目录互不影响/无回归+并发双启/--page hash），输出贴真实命令结果
