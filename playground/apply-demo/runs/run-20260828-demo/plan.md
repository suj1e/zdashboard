# 实施策略（战线: playground-demo · runId: 2026-08-28-1043）

## 输入清单
| change | 层 | 优先级 | 风险 | 预估 | 去向 |
|---|---|---|---|---|---|
| add-auth | 0 | P1 | low | 40min | 批次 0 |
| fix-search | 1 | P2 | medium | 30min | 批次 1 |
| polish-docs | 1 | P2 | low | 15min | 批次 1 |

## 依赖判定摘要
显式 2 条：fix-search → add-auth、polish-docs → add-auth；AI 语义推断 0 条。

## 冲突处置
检出 1 对：fix-search ∩ polish-docs 共享 README.md → 串行化（同批次内顺序执行）。

## 编排结果
- 批次 0：[add-auth]（并行度 2）
- 批次 1：[fix-search, polish-docs]（并行度 2）

## 用户决策记录
按默认计划确认。

## 验收口径
单项完成 = 三门禁全过 + tasks 全勾 + 已归档；批次完成 = 本批所有单项到达终态。

## 变更记录
- （空）
