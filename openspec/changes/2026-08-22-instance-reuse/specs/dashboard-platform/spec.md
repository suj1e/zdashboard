## ADDED Requirements

### Requirement: 同目录单实例复用

系统 SHALL 以 `<root>/.zdev/dashboard.json` 记录运行实例（pid/port/root/startedAt），启动时经双重校验（pid 探活 + `GET /__config` root 比对）判定存活：活实例且未指定 `--restart` 时复用（打开其 URL 并携带 `--page` hash，退出码 0）；任一校验失败视为记录过期，覆盖写新记录。记录须在 listen 成功后以**实际端口**回写。

#### Scenario: 同目录复用

- **WHEN** 项目目录已有活实例，再次执行 `zdashboard --dir <root> --open`
- **THEN** 不启动新进程，打开活实例 URL（含 --page hash），进程以 0 退出并提示已复用

#### Scenario: 陈旧记录自愈

- **WHEN** 记录文件存在但 pid 已死、端口无响应、root 不匹配或文件损坏
- **THEN** 视为过期，正常起新实例并覆盖记录，不报错

#### Scenario: 强制重启

- **WHEN** 指定 `--restart` 且存在活实例
- **THEN** 旧实例收到 SIGTERM（轮询探活、超时 SIGKILL），新实例启动并更新记录

### Requirement: 实例记录清理

系统 SHALL 在 `POST /__stop`、进程 SIGTERM/SIGINT 时 best-effort 清理实例记录；清理失败不构成正确性问题（残留记录由双重校验在下次启动时消化）。

#### Scenario: Ctrl+C 清理

- **WHEN** 运行中的 dashboard 收到 SIGINT
- **THEN** 记录文件被清理（best-effort）后进程退出，just 子进程经清理链回收

## MODIFIED Requirements

### Requirement: CLI 参数（2.0）

CLI SHALL 支持 `--dir <root>`、`--port <n>`、`--open`、`--page <mode>`、`--plugins <dir>`、`--restart`；SHALL NOT 保留 `--mode`。`--page` 仅决定 `--open` 打开 URL 的 hash（含复用路径）；`--restart` 强制停止同目录活实例后重启；`--plugins` 目录下的外部 cordis 插件（index.ts/js/mjs，TS 经 tsx 加载）与内置插件平权挂载，加载失败仅告警不崩溃。

#### Scenario: 外部 TS 插件加载

- **WHEN** `--plugins ./ext` 且 `./ext/my-plugin/index.ts` 导出 cordis 插件
- **THEN** 插件被挂载、其路由可达；文件有语法错误时服务照常启动并打印加载失败日志
