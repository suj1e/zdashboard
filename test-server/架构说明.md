# 架构说明

三层:gateway → service → repository。

| 层 | 职责 | 依赖 |
|---|---|---|
| gateway | 路由/鉴权/限流 | 无 |
| service | 业务编排 | repository |
| repository | 数据访问 | drizzle |
