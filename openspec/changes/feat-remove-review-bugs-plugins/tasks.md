# Tasks

## 1. 删除文件
- [x] git rm -r src/plugins/review src/plugins/bugs
- [x] git rm src/server/review-store.ts src/server/bugs.ts

## 2. cli.ts 解线
- [x] 删两插件 import 与注册项
- [x] 删 migrateLegacyBugsConfig() + yaml import（唯一使用点）

## 3. change 文档
- [x] 作废删除 feat-zdev-contract-paths（未提交）
- [x] 本 change 建立

## 4. 校验
- [ ] grep 无残留引用
- [ ] pnpm build 通过
