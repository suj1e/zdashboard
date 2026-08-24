# auth 能力变更

## ADDED Requirements

- `POST /auth/login` 校验凭据并签发 access/refresh token
- `GET /api/*` 无有效 token 时返回 401
