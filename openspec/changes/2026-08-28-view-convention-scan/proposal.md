# 2026-08-28-view-convention-scan

view 插件扫描约定化:当前分支+.zworktree 每根固定扫 openspec/docs,删除全部配置

## 需求复述

view 插件侧边栏当前带配置弹窗（扫描目录 scanDirs / 默认展开深度 defaultExpandDepth / 显示隐藏文件 showHidden），用户需要手动配置才能改扫描行为。实际使用中扫描目标永远是固定的：**当前分支 + `.zworktree/` 下各 worktree，每根扫描 `openspec/` 与 `docs/` 两个目录**——这是 zdashboard 与 zarchitect/zapply 生态的约定，不是用户偏好。配置失去存在意义。

本 change 将扫描行为约定化（写死），并彻底删除 view 插件的配置面。

## 要解决的问题

1. 配置 UI 增加认知负担：用户面对「扫描目录」这种本不该配置的项
2. 配置链路长：manifest.config → usePluginConfig → /__plugins/config → dashboard.json → core/tree.ts 读取，五跳只为一个默认值
3. scanDirs 配置可被改坏（如清空导致树为空），缺少约定兜底

## 成功标准

1. view 侧边栏无任何配置入口（设置按钮、弹窗、ConfigField 全部移除）
2. `manifest.config` 字段删除；`.zdev/dashboard.json` 中残留的 view 配置键在加载时被清除
3. 树形结构：`当前分支` 组 + 各 worktree 组（`git worktree list` 过滤 `.zworktree/` 段，维持现有行为），每根仅含 `openspec`、`docs` 两个目录的文件树
4. `core/tree.ts` 不再读 dashboard 配置；`spec-scan.ts` 选项收敛（固定深度 2，删除 showHidden/hiddenDirs 参数）
5. 现有测试全部通过；URL 参数（wt/file/filter）行为不变

## 依赖

无前置（独立可交付）。

## 优先级

- P1：view 是最高频使用的插件，约定化直接消除日常使用中的配置噪音；且为 design 约定化（2026-08-28-design-convention-scan）提供同模式先例。
