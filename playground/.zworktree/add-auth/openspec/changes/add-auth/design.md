# Design: 认证模块

## 架构

```
┌─────────┐     ┌─────────────┐     ┌──────────┐
│ Client  │────▶│  Auth Middleware │────▶│  Route  │
└─────────┘     └─────────────┘     └──────────┘
                        │
                        ▼
                  ┌───────────┐
                  │  UserRepo  │
                  └───────────┘
```

## 接口定义

### POST /api/auth/login
Request:
```json
{
  "account": "string",
  "password": "string"
}
```

Response:
```json
{
  "token": "string",
  "expiresIn": 3600
}
```

### POST /api/auth/logout
Header:
```
Authorization: Bearer <token>
```

## 错误码

| Code | Meaning |
|------|---------|
| 401  | 未认证或 token 过期 |
| 429  | 刷新过于频繁 |

## 限流

- 同一 IP 每分钟最多 10 次登录尝试
- 使用滑动窗口计数
