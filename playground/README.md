# zdashboard-playground

一个面向 zdashboard 全场景演示的 playground 项目，用于本地启动 zdashboard 并实时预览所有内置插件能力。

## 已覆盖场景

| 场景 | 触发插件 | 说明 |
|------|---------|------|
| openspec 变更 | apply / view | `openspec/changes/` 下有进行中和归档的 change |
| 项目文档 | view / stats | `docs/` 下有架构文档，根目录有 README |
| just 任务 | just | `justfile` 提供多个 recipe，含成功/失败/彩色日志 |
| 禅道 bugs | bugs | `.zgoal/config.yaml` 指向 mock 禅道，可启动后验证 |
| 文档评审 | review | `.zreview/review.yaml` 包含多状态评审项 |
| 设计资产 | design | `design/` 下有 HTML 页面、tokens、图标 |
| 外部插件 | — | `ext-plugins/demo/` 和 `bare/` 用于验证外部插件加载 |

## 快速启动

```bash
# 1. 构建 zdashboard
pnpm build

# 2. 启动 playground（推荐方式）
node dist/cli.js --dir playground --open

# 3. 或指定端口
node dist/cli.js --dir playground --port 4190 --open

# 4. 直达某个 mode
node dist/cli.js --dir playground --page apply
```

## 启动 mock 禅道（可选）

```bash
node playground/scripts/mock-zentao.cjs
# 监听在 http://localhost:4189
```

启动后进入 `bugs` 模式即可看到模拟的禅道 bug 列表。

## just 任务

```bash
cd playground
just --list

# 模拟彩色日志输出
just serve

# 模拟构建成功
just build

# 模拟失败
just fail

# 带参数
just hello msg=zdashboard
```

## 数据目录

- `.zdev/` — zdashboard 运行时数据（已忽略）
- `.zgoal/config.yaml` — 禅道连接配置
- `.zreview/` — 评审数据（已忽略）

## 外部插件

```bash
node dist/cli.js --dir playground --plugins playground/ext-plugins --port 4296
```

| 插件 | 说明 |
|------|------|
| `demo` | 完整外部插件，带 web viewer |
| `bare` | 最小插件，仅注册 manifest |
