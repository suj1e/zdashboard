# AGENTS.md — zdashboard

OpenSpec 项目的可视化面板（"看板"）：cordis 插件化的 node 服务 + React SPA，为 zskills 生态（zapply/zarchitect/zdesign 等）提供 `.zdev/` 产物的可视化。

## 命令

```bash
pnpm typecheck        # tsc --noEmit（唯一静态门禁，无 lint）
pnpm build            # tsup(后端) && vite build(前端) → dist/
pnpm test             # vitest run
just demo             # 构建 → 杀旧实例 → 播种演示资产 → 起 playground 演示(:4190)
just build
```

**测试环境硬约束**：vitest(jsdom30/undici8) 在默认 Node 20 下**无法启动**。必须：

```bash
mise exec node@22.23.2 -- node "C:/Users/13156/AppData/Local/mise/installs/node/20.20.2/node_modules/pnpm/bin/pnpm.cjs" test
```

（pnpm shim 是 exe 会回落 Node 20；直跑 pnpm.cjs 避免。）

**基线既有测试失败**（勿修、勿归因于自己的改动）：`server-favicon.test`（Windows 临时目录 EPERM/EBUSY，flaky 1-2 例）、`just-runner.test > stop(a)`（进程 kill 时序）。

## 结构与边界

- `src/core/` — 宿主服务（server/reload/tree/manifest/instance/worktrees），插件通过 `ctx.server.route()/sse()` 注册
- `src/sdk/` — 插件唯一接入姿势：`definePlugin`(server) + `defineWebPlugin`(client)，manifest.ts 为 server/client 共享单源
- `src/plugins/<mode>/` — 内置插件（**终态四个：stats/view/design/just**）；`index.ts`+`web.tsx` 即插件，manifest 声明 order/params/config
- `src/server/` — 插件共用的服务端领域逻辑（just-runner、spec-scan、design-assets、walk）
- `src/web/` — SPA（App/router/hooks/kit）；插件页懒加载经 `src/plugins/<mode>/web.tsx`
- `playground/` — 演示项目（dashboard 的 `--dir` 目标），`just demo` 会播种 `design/`→`.zdev/design/`
- 路由全部 `/__*` 前缀；`route()` 精确匹配 + 前缀回退（`/__file-content/xxx` 命中 `/__file-content`）

## 关键约定（改前必读）

- **实例复用带版本比对**（`instance.ts`）：`findReusable(root, version)` 版本落后 → `stale-version` → cli 自动停旧接管（零操作升级）。`writeRecord` 读改写保留 `plugins` 段 + 写 `version`，tmp+rename 原子写。
- **view 扫描白名单**：`CONVENTION_SCAN_DIRS = ['openspec', 'docs', '.zdev/apply']`（`tree.ts`）；点前缀目录必须在 `dotDirs` 显式声明才可扫（`spec-scan.ts`）。每扫描根（当前分支 + 各 `.zworktree/*`）同规则。
- **SSE 刷新纪律**：文件变更只做插件级静默 refetch（`usePluginData` 订阅 `files`/`plugin:<mode>:<event>`），**禁止整页 reload**（曾致闪烁，已修于 App.tsx）。
- **`.zdev/apply` 新约定**（zskills 0.6.x）：扁平 `.zdev/apply/<MMDD-HHmm>-<name>/`，`brief.md`+`state.json`+`report.md`（report 出现即战线了结），无指针文件。
- **配置面已全面移除**：内置插件零配置；`/__plugins/config` 基建仅为外部插件保留；`stripDeadPluginConfig` 启动剥离死键。

## 协作流程（本项目强约定）

- 需求 → `zarchitect` 开 change（proposal/design/tasks + diagrams/）→ **change 文档先 commit** → `zapply` 建 `.zworktree/<name>` 隔离执行 → 三门禁（openspec validate + 测试核查 + 独立 reviewer）→ merge → `openspec archive`。**止于 archive，不 push 不开 PR**（push 由用户/zpush 决定）。
- craftsman 只在 worktree 内改代码 + 勾 tasks.md；proposal/design 只有主智能体可改。
- spec delta 的 MODIFIED 块必须覆盖现存全部 scenario 名（逐字一致）；requirement 改名走 `## RENAMED Requirements`。
- **动手前先查删除史**：`git log --diff-filter=D`——多个插件（apply/market/bugs/review）已被有意删除，别按记忆当回归"修"回来。

## Windows / 环境坑

- shell 是 Git Bash；**cwd 跨命令残留**——cd 后务必显式回退或用绝对路径（已多次踩坑）。
- 快照/`justfile` 等文件测试后出现 CRLF 噪声：`git checkout -- <file>` 还原，勿提交。
- git `core.autocrlf=true`：文本解析一律 `split(/\r?\n/)`（parse-tasks 曾因 CRLF 全量失配）。
- 删 worktree 报 `Device or resource busy`/`Filename too long`：`rm -rf` 后 `git worktree prune` 再删分支。
- push 偶发 schannel TLS 失败：等几秒重试即可。
- 打 `v*` tag → GitHub Actions 自动 npm publish（无需手动发包）。
