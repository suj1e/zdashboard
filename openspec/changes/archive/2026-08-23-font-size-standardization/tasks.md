## 1. CSS 变量清理

- [x] 1.1 删除 `globals.css` 中的 `--text-10`、`--text-11`、`--text-14`
- [x] 1.2 删除 `pixel.css` 中所有 `--text-10`、`--text-11`、`--text-14` 定义（light + dark）
- [x] 1.3 删除 `slate.css` 中所有 `--text-10`、`--text-11`、`--text-14` 定义（light + dark）

## 2. Tailwind 配置清理

- [x] 2.1 删除 `tailwind.config.ts` 中 `fontSize` 下的 `10`、`11`、`14` 映射
- [x] 2.2 确认 `fontSize` 仅保留 `xs`、`sm`、`base`、`lg` 四个标准键

## 3. 组件类名替换

批量替换规则：`text-10` → `text-xs`，`text-11` → `text-sm`

- [x] 3.1 `src/web/layout/StatusBar.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.2 `src/web/components/LogViewer.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.3 `src/web/components/badge.tsx`：替换 `text-10`
- [x] 3.4 `src/web/home/HomeGrid.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.5 `src/web/components/CodeViewer.tsx`：替换 `text-11`
- [x] 3.6 `src/web/components/MdViewer.tsx`：替换 `text-11`
- [x] 3.7 `src/web/components/ui/*.tsx`：扫描并替换（button/tooltip/dropdown-menu/scroll-area）
- [x] 3.8 `src/plugins/view/Sidebar.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.9 `src/plugins/view/OutlineNav.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.10 `src/plugins/apply/Viewer.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.11 `src/plugins/design/Sidebar.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.12 `src/plugins/design/Workspace.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.13 `src/plugins/bugs/Viewer.tsx`：替换 `text-11`
- [x] 3.14 `src/plugins/review/viewers/ReviewViewer.tsx`：替换全部 `text-10`/`text-11`
- [x] 3.15 `src/plugins/stats/Workspace.tsx`：替换 `text-11`

## 4. 主题字号校准

- [x] 4.1 调整 `pixel.css` 的 `--text-xs`/`--text-sm` 值，使视觉大小接近原来的 `text-10`/`text-11`（考虑 VT323 的 size-adjust 补偿）
- [x] 4.2 调整 `slate.css` 的 `--text-xs`/`--text-sm` 值，保持与 default 的区分度
- [x] 4.3 确认 `:root` 默认值 `--text-xs: 0.75rem`/`--text-sm: 0.875rem` 合适

## 5. 构建验证

- [x] 5.1 执行 `pnpm build`，确认无构建错误
- [ ] 5.2 启动服务，视觉确认 default/pixel/slate 三主题字号正常
- [x] 5.3 确认 `grep -rn "text-10\|text-11\|text-14" src/` 无结果
