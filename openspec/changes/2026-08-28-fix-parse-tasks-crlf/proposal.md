## Why

`src/plugins/apply/parse-tasks.ts` 的 `TASK_RE` 逐行匹配 tasks.md,但对 **CRLF 行尾的文件全量失配**——`\r` 是 JS 正则行终止符,`.*$` 无法锚定,`md.split('\n')` 后每行尾残留 `\r` 导致正则不命中,进度恒显示 `0/0`。Windows 环境 git checkout 产出 CRLF 是常态（playground 的 `add-auth` 实测即 `0/0`）,执行进度插件对 Windows 用户基本失效。align-zskills-contracts craftsman 实施中发现并如实披露,属基线既有 bug。

## What Changes

- `parse-tasks.ts` 行切分改为 `md.split(/\r?\n/)`(一行),或等价的行尾 `\r` 归一化
- 补 CRLF 输入的单测(LF/CRLF 混合各一)

## 成功标准

1. CRLF 与混合行尾 tasks.md 的 `countTasks`/`parseTasks` 结果与 LF 一致
2. `pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)

## 依赖

- 前置:openspec/changes/archive/2026-08-28-align-zskills-contracts/(同文件新口径之上修复,避免返工)

## 优先级

- P1：Windows 用户进度显示全挂,一行修复收益极高。
