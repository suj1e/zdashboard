# 设计:外部插件桥接与残留清理(plugin-platform-bridge-cleanup)

## 背景

收尾 change:桥接 + 清理 + 全序列冒烟关口。地基见 plugin-platform-foundation/design.md,插件迁移见 plugin-platform-plugins/design.md。

## 方案设计

### 1. iframe 沙箱收紧与桥接

ExternalWorkspace 改造(核心文件 src/web/components/ExternalWorkspace.tsx + 新增 src/sdk/bridge.ts):

- sandbox 从 `allow-scripts allow-same-origin allow-forms allow-popups` 收紧为 `allow-scripts`。
- 消息协议(宿主 ↔ iframe 双向,所有消息带 `source: 'zdashboard'` 字段防串扰):

| type | 方向 | 载荷 | 说明 |
|---|---|---|---|
| `zd:ready` | iframe→宿主 | — | 握手;宿主回 `zd:init` |
| `zd:init` | 宿主→iframe | { theme, mode, mode: params, config } | 初始状态 |
| `zd:theme` | 宿主→iframe | { theme } | 主题/明暗切换同步 |
| `zd:navigate` | 双向 | { params } | 跨插件导航(宿主侧转 useRoute.navigate) |
| `zd:fetch` | iframe→宿主 | { id, path, init } | 数据代理;宿主同源请求后回 `zd:fetch:result` |
| `zd:fetch:result` | 宿主→iframe | { id, status, body } | 响应回传 |
| `zd:config` | 宿主→iframe | { plugin, config } | 配置只读同步(宿主变更推送) |

> **协议修订记录(实施期收窄)**:design 初版将 `zd:config` 标为「双向」,实施复核后收窄为宿主→iframe 单向——写配置唯一通道 POST `/__plugins/config` 强制 stop-token,而 zd:fetch 代理按安全设计剥离该头,iframe→宿主「写」方向无授权机制(见风险节:外部插件不可获得写权限)。若未来需要外部插件写配置,须先引入显式授权机制再放开方向。

- **fetch 代理**:去掉 allow-same-origin 后外部插件无法 fetch 同源 API,`zd:fetch` 由宿主代为请求;白名单默认放行 `/__` 前缀,其余拒绝(开放问题:粒度后续按需收紧)。
- 时序图:[diagrams/bridge-sequence.html](diagrams/bridge-sequence.html)
- server.ts 的 INJECT 注入脚本同步简化(不再需要强制 `_self` 链接补丁的部分保留,iframe 深链接相关逻辑随桥重写)。

### 2. 残留清理清单

| 项 | 位置 | 动作 |
|---|---|---|
| detect hasBugs 链 | server/detect.ts、core/tree.ts、App/HomeGrid 相关 props | 摘除 bugs 位;DetectResult 形状收敛 |
| `/__files` detect 搭车字段 | core/tree.ts 响应 | 删除(foundation 留的版本期到期) |
| vite 代理 | vite.config.ts | 删 `/__bugs` `/__review` `/__docs`;核对 `/__apply-batch` `/__stats` `/__worktrees` `/__detect` `/__plugins/config` 已补齐 |
| 死 CSS 变量 | src/web/globals.css | 删 `--review-sidebar-w` |
| 孤儿类型 | src/web/lib/types.ts | 删 BugsResult/ZenBug |
| 启动日志 | core/server.ts | 删 `bugs:` 字段打印 |
| 旧 hash 兼容重定向 | router(foundation 引入) | 保留(向后兼容用户书签,不在本次清理范围) |

## 实施步骤

1. bridge.ts 协议实现 + ExternalWorkspace 接线 + sandbox 收紧。
2. playground demo 回归(握手/主题/导航/fetch 四项),bare 兜底回归。
3. 清理清单逐项执行 + grep 验收。
4. 端到端冒烟(全序列关口)。

## 风险与 Trade-off

- **外部插件能力收窄**:localStorage 等受限能力为已知限制(现仅 playground demo,无存量生态);fetch 代理白名单 `/__` 前缀默认放行,安全与便利的折中,记录在 SDK 文档。
- **INJECT 脚本简化**:作用于所有 HTML 静态服务(含外部插件页),改动需回归内置页面文件预览场景。
- **冒烟为人工清单**:本期不引入 playwright 自动化脚本基建(既有 vitest 覆盖单测层);清单固化为 tasks 验收项,后续可升级自动化。
- **开放问题**:zd:fetch 是否需要带 stop-token 的代理——默认不带(外部插件不可获得写权限);若未来需要,须引入显式授权机制,本期不做。

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 桥接时序 | diagrams/bridge-sequence.html | 握手/主题/导航/数据代理(含白名单 alt 分支)完整时序 |

## 测试策略

1. **单元(vitest)**:
   - bridge:消息收发(source 字段校验、未知 type 丢弃)、fetch 代理白名单(`/__` 放行、其余拒绝)、id 配对回传。
   - 清理回归:grep 断言类测试可不做(以 CI grep 脚本/人工验收代替)。
2. **集成(手工冒烟,作为全序列完成关口)**:
   - demo 插件:加载、主题三套×明暗同步、zd:navigate 跳到 stats、zd:fetch 拉 /__stats/data 返回 200。
   - bare 插件:Placeholder 显示。
   - 六内置插件页面 + 首页 + 深链接刷新/后退全走查。
   - DevTools 确认:零 console error;iframe 内 fetch 走 postMessage 无跨域报错。
3. **安全核查**:iframe 内尝试 `window.parent` 访问被 sandbox 阻断;zd:fetch 尝试非 `/__` 路径被拒。
4. **测试数据**:playground + ext-plugins demo/bare;主题切换用 Topbar 控件。
