# 任务:灵感市场插件(feat-inspiration-market)

- [x] T1 骨架 + 目录数据:market 插件骨架(manifest/index/web/Workspace 三 Tab);sources/ 三目录数据文件(logotypes ~200 / motions ~60 / inspirations ~40);PromptPanel 组件(三模板 + 编辑 + 复制 + 最近 5 条)
  - 验收:?p=market 三 Tab 切换(URL 驱动);模板单测三市场各一(插值/源码内嵌/最近记录环形);PromptPanel 编辑后复制 = textarea 值(clipboard mock)
- [x] T2 server 代理 + catalog 路由:GET /__market/proxy(allowlist cdn.jsdelivr.net|data.jsdelivr.com、8s 超时、内存缓存 ≤200 条 TTL 10min、X-Market-Cache 头);GET /__market/catalog/<market>(未知 404)
  - 验收:单测:白名单外 403、透传 Content-Type、上游失败 502、缓存命中 hit、超时降级(fake timers)、catalog 形状/404
- [x] T3 Logo Tab:slug 目录网格(懒加载)+ 前端搜索 + 详情(大图/SVG 源码 CodeViewer)+ 转提示词
  - 验收:组件:搜索过滤、详情渲染、proxy 失败占位;深链接 ?entry= 直达
- [ ] T4 动效 Tab:motions 目录网格(demo 方块实时播放,hover 重播)+ 源码查看 + 转提示词(CSS 内嵌);proxy 拉库 css 解析类名
  - 验收:组件:demo class 切换、解析类名单测、断网降级(目录仍可浏览)
- [ ] T5 灵感 Tab:目录网格(标签过滤)+ 详情 + 新窗口打开 + 转提示词(元数据模板 + 用户补充输入)
  - 验收:组件:标签过滤、模板含用户补充段、新窗口 target 语义
- [ ] T6 回归 + 冒烟:`pnpm typecheck && pnpm test && pnpm build` 全绿;playwright 手工:三市场端到端(搜品牌→详情→转提示词→剪贴板)、三主题×明暗、断网降级、剪贴板拒绝 fallback、零 console error
  - 验收:全绿 + checklist 入报告
