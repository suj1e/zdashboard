## MODIFIED Requirements

### Requirement: 同目录单实例复用

系统 SHALL 以 `<root>/.zdev/dashboard.json` 记录运行实例（pid/port/root/startedAt），启动时经双重校验（pid 探活 + `GET /__config` root 比对）判定存活：活实例且未指定 `--restart` 时复用（打开其 URL 并携带 `--page` hash，退出码 0）；任一校验失败视为记录过期，覆盖写新记录。记录须在 listen 成功后以**实际端口**回写。`--restart` 停止旧实例后，新实例 SHALL 优先尝试旧记录端口（用户显式 `--port` 优先），避免端口漂移使已开标签失效。

#### Scenario: restart 端口继承

- **WHEN** 4190 端口实例被 `--restart` 替换且端口成功释放
- **THEN** 新实例监听 4190（非顺延端口）；用户未显式指定 --port 时

### Requirement: zskills 数据目录约定（.zdev）

系统 SHALL 优先从 `.zdev/` 读取 skill 数据、存量路径回退：bugs 配置（`.zdev/config.yaml` → `.zgoal/config.yaml`）、评审数据（`.zdev/review.yaml` → 根 `review.yaml`）；评审文档列表 SHALL 扫描 `.zdev/*.md`。启动日志 SHALL 打印生效的数据目录。文件变更监听 SHALL 覆盖 `.zdev/` 子目录。

#### Scenario: 配置优先级与回退

- **WHEN** `.zdev/config.yaml` 与 `.zgoal/config.yaml` 并存
- **THEN** bugs 功能读 `.zdev/`；仅存量存在时回退读旧路径不报错

#### Scenario: 评审文档列表

- **WHEN** `.zdev/` 下存在 brief.md/prd.md
- **THEN** `/__docs` 列出它们（根目录 md 不列）；修改 `.zdev/review.yaml` 后前端经 SSE 自动刷新

### Requirement: worktree 感知

apply 进度 SHALL 优先读取 `.zworktree/<change>/openspec/changes/<change>/` 下的 tasks/proposal/design（主目录兜底），卡片标注「worktree 执行中」；`GET /__worktrees` SHALL 返回 `.zworktree/` 下的 worktree 清单（名称/分支）；view 文件树 SHALL 排除 `.zworktree/`。dashboard SHALL NOT 执行任何写 git 操作。

#### Scenario: worktree 进度优先

- **WHEN** 主目录 tasks.md 为空、worktree 内已勾 2/5
- **THEN** apply 卡片显示 2/5 与执行中 badge，不显示 0/5

#### Scenario: 文件树无副本噪音

- **WHEN** 项目存在 `.zworktree/<name>/`（整套代码副本）
- **THEN** view 工作区文件树不显示该目录
