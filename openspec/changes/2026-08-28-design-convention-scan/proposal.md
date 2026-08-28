# 2026-08-28-design-convention-scan

design 插件按约定扫 .zdev/design,删除 folders 配置与孤儿配置组件

## 需求复述

设计资产的产出位置是 zskills 生态约定（zdesign/zasset 统一写入 `<root>/.zdev/design/`：`brands/<slug>/DESIGN.md`、`assets/<slug>/`、`diagram-style.md`），不是用户偏好。当前 design 插件却有 `folders: string[]` 配置让用户手动指定扫描目录——约定既定，配置无意义。

本 change 将 design 扫描约定化，并完成全项目配置面清理的收尾（孤儿组件删除 + 存储残留剥离）。

## 要解决的问题

1. `folders` 配置与 zskills 约定重复：skill 永远写 `.zdev/design/`，手配 folders 反而可能指向约定外目录
2. view 约定化（2026-08-28-view-convention-scan）后，`ConfigField`/`usePluginConfig` 仅剩 design 一个消费方，成为孤儿代码

## 成功标准

1. design 侧边栏无配置入口；`manifest.config` 删除
2. `/__design/assets` 恒扫 `<root>/.zdev/design/`；目录不存在时返回全空分组（现有 `emptyScan` 形状）
3. `ConfigField.tsx`、`usePluginConfig.ts` 及其测试删除（全仓库无引用）
4. `.zdev/dashboard.json` 中残留的 `plugins.design`/`plugins.view` 等未声明配置键加载时剥离
5. `pnpm typecheck && pnpm test` 全绿

## 依赖

- 前置：openspec/changes/2026-08-28-view-convention-scan/（孤儿组件删除依赖 view 侧先移除 `usePluginConfig` 消费点；若先行实施则本 change 一并承担 view 残留清理）

## 优先级

- P2：约定兜底代码已存在（folders 为空时 fallback `.zdev/design`），收益是删繁就简；排在 view 约定化之后。
