# 提案:Topbar 显示项目名(feat-topbar-project-name)

## 需求复述

用户(2026-09-02):同时启动多个项目的 dashboard 时分不清是哪个项目的——header(以及浏览器标签页)只有「zdashboard」字样,要求加上项目名。改完发新包。

## 要解决的问题

1. Topbar 品牌区只有「zdashboard」,多实例无分辨标识。
2. `document.title` 为 index.html 静态值,浏览器多标签全部同名——比页内 header 更影响分辨。

## 成功标准

1. Topbar 品牌名后显示项目名 chip(`zdashboard` + 分隔 + 根目录 basename,如 `elysia`);无项目路径时仅显示品牌名(不显示空 chip/分隔符)。
2. `document.title` 同步为 `<项目名> · zdashboard`;无项目路径时保持 `zdashboard · 项目洞察`(现状)。
3. 多项目深链接/主题切换/移动端窄屏不破版(chip 超长 truncate + title 提示)。
4. 基线测试全绿 + 新增组件测试(Topbar 渲染 chip;title 副作用)。

## 非目标

- 不做多项目聚合/切换器(单页只反映自身项目)。
- 不改 StatusBar 既有 projectPath 展示。

## 依赖

- 无前置(基于 main@v2.13.0)。

## 优先级

- P2:多实例体验缺陷,体量小(2 文件)。
