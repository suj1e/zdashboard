## ADDED Requirements

### Requirement: 外部插件沙箱与 postMessage 桥

外部插件 iframe SHALL 仅使用 `allow-scripts` 沙箱(不含 allow-same-origin);外部插件与宿主 SHALL 经 postMessage 桥通信,协议消息 SHALL 携带 `source: 'zdashboard'` 防串扰字段,支持 `zd:ready`/`zd:init`/`zd:theme`/`zd:navigate`/`zd:fetch`/`zd:fetch:result`/`zd:config`。数据请求 SHALL 由宿主代理:默认放行 `/__` 前缀路径,其余拒绝并回传 403。外部插件自动接线约定(mode === 目录名、web/index.html → viewerUrl)SHALL 保持不变,存量 playground demo/bare 样例无需修改即可运行。

#### Scenario: 白名单代理

- **WHEN** 外部插件经 `zd:fetch` 请求 `/__stats/data` 与 `/etc/passwd`
- **THEN** 前者由宿主代理返回 200 与数据;后者被拒绝回传 403,浏览器无跨域报错

#### Scenario: 主题与导航同步

- **WHEN** 用户切换主题或外部插件发起 `zd:navigate`
- **THEN** iframe 实时收到 `zd:theme` 同步;宿主按 navigate params 执行插件跳转

### Requirement: 插件序列完成冒烟关口

plugin-platform 三 change 序列 SHALL 以端到端冒烟作为完成关口:六个内置插件页面、首页、外部 demo 插件、三套主题×明暗、深链接刷新/后退全部走查,console 零 error;bugs/review 删除残留(detect hasBugs 链、vite 代理、死 CSS 变量、孤儿类型、启动日志字段、`/__files` detect 搭车字段)SHALL 清零。

#### Scenario: 残留清零核验

- **WHEN** 在 src/ 与 vite.config.ts 中 grep hasBugs、ZenBug、BugsResult、review-sidebar 及 bugs/review 代理
- **THEN** 全部无命中;`/__files` 响应不含 detect 字段
