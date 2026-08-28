# 设计:just 日志编码智能解码

## 现有系统分析

`just-runner.ts:95-105` `push(d: Buffer)`：`task.pending += d.toString()`（UTF-8）→ 按 `\n` 切行 pushLine。两处缺陷：
1. Windows cmd 码页（GBK）输出的中文按 UTF-8 解码 → 乱码
2. `d.toString()` 在 chunk 边界切开多字节字符本身就会产生 U+FFFD（既有隐患）

## 方案设计

### 方案 A：字节级行切分 + 逐行 UTF-8 严格解码回退 GBK（选定）

```ts
const pending: Buffer 字节缓冲
push(d: Buffer):
  pending = Buffer.concat([pending, d])
  循环 idx = pending.indexOf(0x0a):          // 行界字节切分
    line = pending.subarray(0, idx + 1); pending = pending.subarray(idx + 1)
    pushLine(task, decodeLine(line))
decodeLine(buf):
  try { return utf8Strict.decode(buf, { stream: false }) }  // TextDecoder('utf-8',{fatal:true})
  catch { return iconv.decode(buf, 'gbk') }
```

- **行界安全性**：UTF-8 续字节 ≥ 0x80、GBK 尾字节 0x40–0xFE，均不含 0x0A → 按字节切行不会切开多字节字符
- **跨 chunk 安全**：不完整的行留在字节缓冲，解码只发生在完整行上——多字节跨 chunk 天然正确
- `iconv-lite` 新依赖（编码域标准库，craftsman 阶梯第③级：非平凡易错领域 + 手写需自维护码表，报告备案）

**不做**：
- 不改 FORCE_COLOR/MAVEN_OPTS 等既有 env
- 不做用户可配置编码（YAGNI，智能回退覆盖双派）
- 不动 stop/kill 与身份守卫逻辑

**备选 B：chcp 65001 前置**——被否：仅覆盖尊重码页的工具，GBK 原生输出（部分 java/老工具链）仍乱；用户已拍板 iconv 路线。

## 接口 / 数据契约

`/__just/logs`、SSE `log` 事件协议不变；`pushLine` 签名不变（入参已是解码后的行文本）。

## 实施步骤

1. TDD：decodeLine/行切分单测——GBK 中文 Buffer→正确中文、UTF-8 中文→不回归、混合行、多字节跨 chunk（手工构造分片）、纯 ASCII 不回归
2. 实现 pending 字节缓冲 + decodeLine，接 iconv-lite
3. 回归 + playground 手验（`just hello msg=中文` 与 `just lines`）

## 性能优化点

逐行解码替代逐 chunk toString，行为等价；iconv GBK 仅在 UTF-8 严格解码失败时触发，正常 UTF-8 路径零开销（TextDecoder 原生）。

## 风险与 Trade-off

- 风险：某些工具输出「合法但错误」的编码序列时启发式选错边——UTF-8 严格校验通过率在实际输出中极高（ASCII 完全同域），错判面极小
- 风险：iconv-lite 体积——server 侧依赖，不进前端 bundle
- 开放问题：无

## 测试策略

- **单元**（`just-runner` 解码层,构造 Buffer 直接喂 push 等价入口）：GBK 中文行→正确解码；UTF-8 中文行→不回归；GBK+UTF-8 混合多行→各行正确；多字节跨 chunk（把一行中文从字节中点切成两个 chunk）→不错乱；纯 ASCII→不回归
- **回归**：现有 just-runner 测试不回归（基线 stop(a) 环境失败除外）；`pnpm typecheck && pnpm test` 全绿

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 解码管线 | diagrams/decode-pipeline.html | 字节级行切分 → UTF-8 严格解码 → GBK 回退的完整数据流 |
