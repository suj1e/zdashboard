# 提案:增加认证能力

## Why

当前接口无鉴权,内网试点阶段可接受,对外开放前必须补上。

## What Changes

- 新增 `POST /auth/login` / `POST /auth/logout`
- 全部 `/api/*` 增加 Bearer 校验中间件
- 用户表增 `password_hash` 列

## Impact

- affected: `auth`, `middleware`, `user`
