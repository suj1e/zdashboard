## Why

Windows 中文环境下 just runner 日志中文乱码：`just-runner.ts` 用 `d.toString()` 按 UTF-8 解码子进程输出，而 Windows 下 `just` 经 cmd 码页（GBK）输出中文 → 必乱码。同文件里用 `just` 的用户输出（node 脚本等）是 UTF-8——**两种编码在真实项目里混存**，单边解码顾此失彼。

## What Changes

- `src/server/just-runner.ts` 输出解码改造：**字节级行切分**（`Buffer.indexOf(0x0a)`，UTF-8 续字节与 GBK 尾字节均不可能为 0x0a，行界安全）→ 每完整行先 UTF-8 严格解码（`TextDecoder('utf-8', { fatal: true })`），失败回退 `iconv-lite` GBK 解码
- 新增依赖 `iconv-lite`（成熟开源库，编码域阶梯选型）
- stderr 同规则处理

## 成功标准

1. GBK 输出的中文（如 cmd echo）正确显示；UTF-8 输出（node 脚本中文）不回归；多字节字符跨 chunk 边界不错乱
2. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。

## 优先级

- P1：中文用户核心可读性缺陷。
