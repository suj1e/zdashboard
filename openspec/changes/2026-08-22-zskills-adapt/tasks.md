# Tasks: zskills 协议适配

## P0 — .zdev 迁移

- [ ] 1.1 `src/server/bugs.ts` + `src/server/detect.ts`：BUGS_CONFIG_CANDIDATES = ['.zdev/config.yaml', '.zgoal/config.yaml'] 依序探测；hasBugs 同逻辑；fetchBugs 错误文案改 .zdev
- [ ] 1.2 `src/server/review-store.ts`：file 取 ['.zdev/review.yaml', 'review.yaml'] 第一个存在者（都不存在用 .zdev 路径）；docs() 扫 .zdev/*.md
- [ ] 1.3 SSE 覆盖实测（.zdev 文件改动触发 files 事件）；cli/server 启动日志加 `data -> .zdev/` 行（.zdev 存在时）

## P1 — worktree 感知

- [ ] 2.1 `src/plugins/apply/scan.ts`：scanApplyChanges/readApplyChange 优先读 .zworktree/<name>/openspec/changes/<name>/ 下文件；ChangeSummary/Detail 加 inWorktree
- [ ] 2.2 `src/plugins/apply/index.ts`：GET /__worktrees（git worktree list --porcelain，只回 .zworktree 下的，git 失败 []）
- [ ] 2.3 `src/plugins/apply/Viewer.tsx`：inWorktree badge「worktree 执行中」+ worktree 总览条（名称/分支 chips）+ 依赖 badge（proposal「## 依赖」节，前置未归档灰显）+「含测试策略」badge
- [ ] 2.4 `src/server/spec-scan.ts`：根 skip 集合加 .zworktree

## P2 — 打磨

- [ ] 3.1 `src/cli.ts`：--restart 且有旧记录时起始端口用 record.port（显式 --port 尊重用户）
- [ ] 3.2 验收 6 条真跑（.zdev 优先/回退、review 数据+文档+SSE、worktree 进度+badge、树排除、--restart 端口不变、vitest + 5 skill --page 直达）

## 收尾

- [ ] 4.1 README 更新（.zdev 数据约定、/__worktrees、--restart 端口继承）
