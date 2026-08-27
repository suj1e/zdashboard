# 提案:外部插件桥接与残留清理(plugin-platform-bridge-cleanup)

## 需求复述

插件体系重写第三个 change(收尾):外部插件 iframe 沙箱收紧并补 postMessage 通信桥;清除 bugs/review 删除残留与各类死代码;执行端到端冒烟验收。外部插件自动接线约定(mode === 目录名、web/index.html → viewerUrl)保持不变,playground 现有 demo/bare 样例无需改动即可继续运行。

## 要解决的问题

1. **沙箱失效**:ExternalWorkspace 同时开 allow-scripts + allow-same-origin,iframe 可访问父域一切 API(包括携带 stop-token 凭证可读的 /__config)→ 收紧为 allow-scripts。
2. **外部插件与宿主零通信**:主题切换不同步、无法发起导航、拿不到配置、去掉 same-origin 后也无法 fetch 同源 API → postMessage 桥(zd:ready/init/theme/navigate/fetch/config)。
3. **bugs/review 残留**:web/lib/plugins.ts ORDER 数组(注:注册表主体已由 foundation 改造,此处兜底 grep)、detect hasBugs 全链(detect.ts → tree.ts → App → HomeGrid)、vite.config 代理 /__bugs /__review /__docs、globals.css `--review-sidebar-w`、web/lib/types.ts BugsResult/ZenBug 孤儿类型、server 启动日志 `bugs:` 字段、`/__files` 响应中的 detect 搭车字段(foundation 留的版本期到本期结束)。
4. **收尾无验收**:三 change 序列缺一个端到端冒烟关口 → 本 change 末尾执行全量走查。

## 成功标准

1. iframe sandbox 仅为 allow-scripts;demo 插件经桥完成:加载握手、主题同步、zd:navigate 跳转、zd:fetch 拉 /__stats/data 成功。
2. bare(无 UI)插件仍显示 PlaceholderWorkspace。
3. 残留清零:`grep -rn "hasBugs\|ZenBug\|BugsResult\|review-sidebar" src/` 无命中;`grep -rn "bugs\|review" vite.config.ts` 无命中;`/__files` 响应无 detect 字段。
4. build + test 全绿;playwright 冒烟(六插件 + 外部 demo + 主题切换 + 深链接)零 console error——作为整个重写序列的完成关口。

## 依赖

- 前置:openspec/changes/plugin-platform-foundation/(router/kit/注册表)
- 前置:openspec/changes/plugin-platform-plugins/(冒烟覆盖其产物,须在其后)

## 优先级

- P3:收尾性质;前两个 change 交付后执行。
