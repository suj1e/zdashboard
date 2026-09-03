# 设计:Topbar 显示项目名(feat-topbar-project-name)

> 快车道:改动面 2 文件(App.tsx + Topbar.tsx),数据源现成(App 已 fetch /__config 持有 projectPath),无架构取舍。

## 现有系统分析

- App.tsx:52 已 `loadJsonLenient<{root?}>('/__config')` → `projectPath`(根绝对路径),现仅传给 StatusBar。
- Topbar.tsx:品牌区 `<strong>zdashboard</strong>` + children 槽 + 连接状态/主题/停止;无项目信息。
- index.html:`<title>zdashboard · 项目洞察</title>` 静态。

## 方案设计

1. **App.tsx**:`const projectName = useMemo(() => projectPath.split('/').filter(Boolean).pop() ?? '', [projectPath])`;`<Topbar projectName={projectName} />`;`useEffect(() => { if (projectName) document.title = `${projectName} · zdashboard`; }, [projectName])`。
2. **Topbar.tsx**:新增可选 prop `projectName?: string`;品牌名后渲染:
   ```tsx
   {projectName && (
     <>
       <span className="text-muted-foreground/40 text-sm">/</span>
       <span className="text-sm text-muted-foreground max-w-[160px] truncate" title={projectName}>{projectName}</span>
     </>
   )}
   ```
3. 边界:projectPath 为空(极端 fetch 失败)→ title/document 不动;根为盘符/裸路径(split 后空)→ 回退空。

## 接口 / 数据契约

- Topbar props 增 `projectName?: string`(可选,向后兼容既有测试)。
- 无新路由/存储。

## 风险与 Trade-off

- document.title 幂等写,无副作用面;多开分辨以浏览器标签为主、页内 chip 为辅。

## 测试策略

1. **组件**:Topbar 传 projectName 渲染 chip 文本;不传则无 chip;超长名 truncate 类存在。
2. **集成(App)**:mock /__config 返回 root → document.title 含项目名;root 缺失 → title 保持默认。
3. **回归**:基线全量 + typecheck + build;既有 Topbar 用例不受影响(props 可选)。

## 上线与人工动作

- 无。
