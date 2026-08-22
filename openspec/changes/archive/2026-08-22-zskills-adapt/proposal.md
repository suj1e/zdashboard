## Why

zskills 侧定稿新协议（无 --mode / 配置统一 `.zdev/` / worktree 执行模型 / 单实例复用），zdashboard 不适配则 bugs/review 功能直接断链：skills 现在把禅道配置与评审数据写在 `.zdev/` 下，zdashboard 还在读 `.zgoal/`；zapply 新执行模型在 `.zworktree/<change>/` 独立 worktree 勾 tasks.md，apply 视图读主目录会进度失真。

## What Changes

### P0 — .zdev 迁移（不改则功能断裂）

- bugs 配置路径：优先 `.zdev/config.yaml`，回退 `.zgoal/config.yaml`（存量项目兼容）；hasBugs 探测同逻辑；错误文案改「.zdev/config.yaml 缺失(由 zgoal skill 创建)」
- 评审数据：review.yaml 优先 `.zdev/review.yaml`，回退根目录 `review.yaml`；`/__docs` 改扫 `.zdev/*.md`（zreview 的 brief.md/prd.md 落这里），根目录 md 不列
- 确认 SSE reload 监听覆盖 `.zdev/` 子目录（改 review.yaml/文档自动刷新）
- 启动日志打印数据目录一行（`data -> .zdev/`）

### P1 — worktree 感知（zapply 新执行模型配套）

- apply 进度：每 change 优先读 `.zworktree/<name>/openspec/changes/<name>/tasks.md`（真实进度），主目录兜底；卡片加「worktree 执行中」badge（worktree 目录存在即显示）
- `/__worktrees` 接口：跑 `git worktree list --porcelain`，apply 视图顶部显示 worktree 总览（名称/分支/脏状态）
- view 文件树排除 `.zworktree/`（否则整套代码副本是纯噪音）
- （可选）change 卡片解析 proposal.md「## 依赖」节显示依赖 badge，前置未归档显示「等待前置」

### P2 — 打磨

- `--restart` 端口继承：停旧实例后新实例优先尝试旧记录端口（拿不回再顺延），书签/标签不失效
- `--page` hash 与图标栏 mode 名严格一致性确认（skills 直达硬契约）
- （可选）apply change 详情渲染 design.md「## 测试策略」节或加 badge

### 不做

- 不动实例复用协议（已验收）
- 不加 --mode（已废除）
- dashboard 不做任何写 git 操作（merge/清理归 zapply + 用户确认）

## Capabilities

### Modified Capabilities

- `dashboard-platform`：数据目录约定（.zdev 优先 + 存量回退）、worktree 感知（apply 进度与文件树）、`/__worktrees` 端点、--restart 端口继承、--page 契约
