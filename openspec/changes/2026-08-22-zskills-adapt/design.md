# Design: zskills 协议适配（.zdev 迁移 + worktree 感知 + 打磨）

基于 main（2.1.0 后）。现状相关文件：`src/server/detect.ts`（hasBugs 探测 .zgoal/config.yaml）、`src/server/bugs.ts`（loadZgoalConfig 读 .zgoal/config.yaml）、`src/server/review-store.ts`（REVIEW_FILE='review.yaml' 根目录 + docs() 扫根目录 md）、`src/plugins/apply/scan.ts`（scanApplyChanges/readApplyChange 读主目录 openspec/changes）、`src/server/spec-scan.ts`（scanTree 的 skip 集合）、`src/core/reload.ts`（fs.watch root recursive）、`src/cli.ts`（--restart → stopInstance → 起新，port 用 args.port）、`src/plugins/apply/Viewer.tsx`（change 卡片）。

## P0 — .zdev 迁移

### 1. bugs 配置（detect.ts + bugs.ts）

- 抽公共 `resolveDataFile(root, rel)`：`<root>/.zdev/<rel>` 存在则返回，否则 `<root>/<legacyRel>`（bugs 场景 legacyRel='zgoal/config.yaml'，实际上就是 `.zgoal/config.yaml` 整路径——直接列候选路径数组更直白：`['.zdev/config.yaml', '.zgoal/config.yaml']` 依序取第一个存在者）
- `bugs.ts` loadZgoalConfig 改用候选数组；返回的 cfg 不变（ZgoalConfig 接口名可保留，避免大改）
- `detect.ts` hasBugs = 任一候选存在
- fetchBugs 失败文案：`.zdev/config.yaml 缺失(由 zgoal skill 创建)`
- 候选数组提为具名常量 `BUGS_CONFIG_CANDIDATES`

### 2. 评审数据（review-store.ts）

- ReviewStore 构造：`this.file = 第一个存在的 ['.zdev/review.yaml', 'review.yaml']`；都不存在用 `.zdev/review.yaml`（新建场景跟着新协议走）
- `docs()` 改扫 `<root>/.zdev/*.md`（只文件、按名排序）；目录不存在返回 []
- 写入（updateItem/setStatus）写 this.file（即回退场景写存量位置，不迁移搬家——最小惊讶）
- **SSE 覆盖确认**：reload 的 fs.watch(root, recursive) 递归监听覆盖 .zdev/ 子目录，无需改（验收时实测：改 .zdev/review.yaml → 前端收 files 事件）

### 3. 启动日志

cli.ts banner 或 ServerService listen 回调加一行：`data -> <实际数据目录>`（.zdev 存在显示 `.zdev/`，否则显示 legacy 路径）。放在 detect 行后。简单实现：ServerService config 加 `dataDir?: string`（cli 计算后传入），listen 回调打印。dataDir 计算放 cli：`.zdev/` 目录存在 ? '.zdev/' : ''（为空则不打印该行）。

## P1 — worktree 感知

### 4. apply 进度读 worktree（scan.ts + Viewer.tsx）

- `worktreeDir(root, name) = path.join(root, '.zworktree', name)`
- scanApplyChanges：每 change 计算 `wt = worktreeDir(root, ent.name)`；tasks.md 读 `wt/openspec/changes/<name>/tasks.md`（存在优先），否则主目录；summary 加 `inWorktree: fs.existsSync(wt)`
- readApplyChange 同理（proposal/design/tasks 优先 worktree 内的；主目录兜底）
- Viewer.tsx 卡片：`inWorktree` → 蓝色小 badge「worktree 执行中」；类型接口同步加字段
- ChangeDetail/ChangeSummary 接口加 `inWorktree: boolean`

### 5. /__worktrees 接口（apply 插件 index.ts）

- `GET /__worktrees`：`execFile('git', ['worktree', 'list', '--porcelain'], { cwd: root, timeout: GIT_TIMEOUT_MS(5000) })`
- 解析 porcelain：worktree <path> / HEAD <sha> / branch <ref> / detached / bare 块；**只返回 .zworktree 下的**（path 含 `.zworktree/`），输出 `{ path, name(目录名), branch, head }`；git 失败返回 `[]`
- apply Viewer 顶部：有 worktree 时显示总览条（名称/分支 chips），点击 name 跳转不影响——纯展示
- effect 化：无子进程残留（execFile 一次性），路由经 ctx.server.route 自动 effect

### 6. view 树排除 .zworktree（spec-scan.ts）

- scanTree 的根目录 skip 集合加 `.zworktree`；「其他」组只收根目录 md 不受影响
- （可选项不做：worktrees 分组入口/内联切换——本期不做，下期有需要再加）

### 7.（可选，做）change 依赖 badge

- readApplyChange 解析 proposal.md 的 `## 依赖` 节：提取列表行 `- <change-name>`（宽容解析：取行首非空段）
- ChangeDetail 加 `dependsOn: string[]`；Viewer 详情区显示「依赖: <名>」chips；被依赖 change 仍在 openspec/changes（未归档）时该 chip 灰显「等待前置」——需要列表交叉比对（scanApplyChanges 的 name 集合）

## P2 — 打磨

### 8. --restart 端口继承（cli.ts）

- `--restart` 分支：stopInstance 后，起服务用 `record.port` 作为起始端口（而非 args.port）：`ctx.plugin(ServerService, { port: args.port ?? record.port ... })`——准确说：restart 且 record 存在时 `const startPort = record.port`；用户显式 --port 时尊重 --port。stopInstance 已等到旧进程退出（SIGTERM→SIGKILL），端口已释放，EADDRINUSE 顺延兜底极端情况
- 记录写回仍是实际端口（onListen 机制不变）

### 9. --page 契约确认（验收即可，无代码）

- mode 名清单：view/stats/just/bugs/review/apply/design + 外部插件 mode；hash 直达已实现（App.tsx onHash 与 plugins.some 匹配）。验收：`#design` `#review` 直达各验一次

### 10.（可选，做）测试策略展示

- readApplyChange 已返回 design.md 全文；Viewer 的 design 渲染区（ReactMarkdown）自动包含「## 测试策略」标题——**确认渲染即满足**；加 badge：`design.includes('## 测试策略')` → 「含测试策略」小 badge 于详情头部。改动极小。

## 验收（对应用户 6 条）

1. `.zdev/config.yaml` + `.zgoal/config.yaml` 并存 → /__bugs 读 .zdev；只留 .zgoal → 回退成功（mock 禅道下 bugs 有数据）
2. `.zdev/review.yaml` + `.zdev/brief.md` → /__review 有数据 + /__docs 列出 brief.md；改 review.yaml → SSE files 事件到达
3. 造 `.zworktree/<change>/openspec/changes/<change>/tasks.md`（勾 2/5）+ 主目录 tasks.md 全空 → /__apply 显示 2/5 + inWorktree badge
4. view 树（/__files）不含 .zworktree
5. `--restart` 后端口不变（旧端口释放场景）
6. vitest 全绿 + 手动过 5 个 skill 启动路径（--page view/bugs/review/design/apply 各直达一次 hash 一致）

## 明确不做

- worktrees 分组入口/内联切换（view 树）
- dashboard 写 git（merge/清理）
- 实例复用协议改动、--mode 复活
