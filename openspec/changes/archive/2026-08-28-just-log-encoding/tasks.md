# 任务:just 日志编码智能解码

- [x] 1. 新增 `iconv-lite` 依赖(锁定版本,server 侧)
  - 验收:package.json/pnpm-lock 变更;typecheck 通过
- [x] 2. TDD:解码层单测——GBK 中文行/UTF-8 中文行/混合多行/多字节跨 chunk 切分/纯 ASCII,先红后绿
  - 验收:单测覆盖 design.md 五场景
- [x] 3. 实现 pending 字节缓冲行切分 + decodeLine(UTF-8 严格回退 GBK),stdout/stderr 同规则
  - 验收:全部解码用例绿;现有 runner 测试不回归(stop(a) 基线环境失败除外)
- [x] 4. 回归 + playground 手验:`just hello msg=中文`、`just lines` 中文正确显示
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外);手工 checklist 过
