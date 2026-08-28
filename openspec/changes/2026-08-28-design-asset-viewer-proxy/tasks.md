# 任务:design 资产代理路由

- [x] 1. TDD:路由三分支失败测试(合法资产 200+MIME / `..` 穿越 400 / 缺失 404)
  - 验收:测试先红
- [x] 2. 实现 `GET /__design/asset` 代理(MIME 复用 core/server 表,不复制);viewers iframe src 切换
  - 验收:三分支全绿;组件断言 src 走代理
- [x] 3. 回归 + playground 手验资产预览
  - 验收:`pnpm typecheck && pnpm test` 全绿;手工 checklist 过
