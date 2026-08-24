# Proposal: 认证模块

## 问题

当前 zdashboard 无用户认证，所有接口公开可访问。

## 目标

引入接口级 token 校验，保护敏感操作。

## 方案

1. 新增 user 表，使用 argon2 存储密码哈希
2. 提供 login/logout 接口，返回 Bearer token
3. 中间件校验 token，未携带返回 401
4. 刷新接口加入限流，防止暴力破解

## 依赖

- 无外部依赖变更
- 复用现有 cordis 中间件机制

## 里程碑

- M1: user 表 + 密码哈希
- M2: login/logout
- M3: 中间件 + 401 统一错误体
- M4: 限流
