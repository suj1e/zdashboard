# zdashboard

ZCode skill 的通用 dashboard 平台。核心不动，skill 自带 viewer，未来 N 个 dashboard 自然接入。

## 架构

```
zdashboard/                    ← 一个核心包，永远不写业务逻辑
├── src/
│   ├── server/
│   │   ├── detect.ts           ← 自动发现 .zxxx/ 目录
│   │   ├── index.ts            ← /__<mode> 路由 → 委托给 plugin API handler
│   │   └── plugins.ts          ← plugin 加载器
│   └── web/
│       ├── App.tsx             ← mode 驱动 sidebar + viewer 加载
│       └── ...
├── src/plugins/                ← 内置 plugins（随核心发版）
│   ├── bugs/
│   ├── view/
│   └── review/
└── package.json
```

## Plugin 约定

每个 skill 在 `assets/dashboard-viewer/` 放一个轻量 plugin：

```
skills/zgoal/assets/dashboard-viewer/
├── index.ts       ← 注册：mode='bugs'，label='禅道'
├── Viewer.tsx     ← 页面组件
└── sidebar.tsx    ← sidebar 按钮（可选）
```

```ts
// skills/zgoal/assets/dashboard-viewer/index.ts
export default {
  mode: 'bugs',
  label: '禅道',
  icon: '🎯',
  viewer: () => import('./Viewer'),
  sidebar: () => import('./sidebar'),
  apiRoutes: {
    '/api/bugs': async (req, res, root) => { /* ... */ }
  }
}
```

核心平台启动时：
1. 加载内置 plugins（`src/plugins/`）
2. 扫描 `--plugins` 目录加载外部 plugins
3. 根据 `--mode` 激活对应 plugin

## 用法

```bash
# skill 直接调用
npx zdashboard@latest --mode bugs --dir <项目根> --open
npx zdashboard@latest --mode view --dir <项目根> --open
npx zdashboard@latest --mode review --dir .zreview --open

# 人类直接访问
npx zdashboard --mode bugs --dir /path/to/project --port 4190
```

## 迁移状态

- [x] zview-dashboard → zdashboard（v1.0.0）
- [ ] zreview-dashboard → zdashboard plugin
- [ ] zdesign-dashboard → zdashboard plugin
- [ ] zskills skill SKILL.md 统一调用 zdashboard
