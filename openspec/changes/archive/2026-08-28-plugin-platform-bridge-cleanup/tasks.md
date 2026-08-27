# 任务:外部插件桥接与残留清理(plugin-platform-bridge-cleanup)

> 前置:plugin-platform-foundation 与 plugin-platform-plugins 已合入。顺序即执行序。

- [x] T1 桥协议:`src/sdk/bridge.ts`(zd:ready/init/theme/navigate/fetch/config,source 字段 + id 配对 + `/__` 白名单);ExternalWorkspace sandbox 收紧为 allow-scripts 并接线
  - 测试验收:vitest:未知 type 丢弃、白名单放行/拒绝、id 配对回传
- [x] T2 demo/bare 回归:playground demo 完成握手、主题同步、zd:navigate、zd:fetch 四项;bare 仍显示 Placeholder
  - 测试验收:手工清单全过;iframe 内无跨域报错;window.parent 访问被阻断
- [x] T3 残留清理:detect hasBugs 链摘除;/__files detect 搭车字段删除;vite 代理修整;--review-sidebar-w;types.ts 孤儿类型;server 启动日志
  - 测试验收:`grep -rn "hasBugs\|ZenBug\|BugsResult\|review-sidebar" src/` 无命中;vite.config 无 bugs/review/docs 代理;curl /__files 响应无 detect 字段
- [x] T4 端到端冒烟(全序列完成关口):六内置插件 + 首页 + 外部 demo + 三主题×明暗 + 深链接刷新/后退全走查
  - 测试验收:零 console error;`pnpm build && pnpm test` 全绿;三 change 状态核对(foundation/plugins 可 archive,本 change 验收后 archive)
