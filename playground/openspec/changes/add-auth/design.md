# 技术方案:认证

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Gateway   │────▶│   Service   │────▶│ Repository  │
│  JWT 校验   │     │  Auth 逻辑   │     │  User 表    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 接口定义

### POST /auth/login

Request:
```json
{
  "username": "string",
  "password": "string"
}
```

Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "admin"
  }
}
```

### POST /auth/logout

Response:
```json
{
  "ok": true
}
```

## 中间件

```typescript
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'missing token' });
  // verify jwt...
  next();
}
```

## 数据模型

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
```

## 安全考虑

- 密码使用 argon2 哈希
- JWT 过期时间 2h
- Refresh token 存储于 httpOnly cookie
