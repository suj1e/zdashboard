> 归档前核验(2026-08-28,zapply batch 后):本 change 已随 56fc351 实施上线并经会话内验证
> (POST /__plugins/config 200 + SSE 广播 + design/bugs/view 配置面板浏览器走查)。
> 后续演进:配置路由与 schema 现单源于 src/core/manifest.ts(foundation 重写),bugs 迁移节(§2)
> 已随 feat-remove-review-bugs-plugins 整体移除 bugs 插件而被取代。逐项按"交付时已实现"勾选。

## 1. Backend: Config API & Storage

- [x] 1.1 Extend `InstanceRecord` type in `src/core/instance.ts` to include `plugins?: Record<string, Record<string, unknown>>`; add `readPluginsConfig(root)` and `writePluginsConfig(root, plugins)` with atomic write (write to temp + rename)
- [x] 1.2 Add `GET /__plugins/config` route in `src/core/server.ts` that reads dashboard.json, merges with plugin defaults from `DashboardService`, and returns `{ [mode]: { [key]: value } }`
- [x] 1.3 Add `POST /__plugins/config` route in `src/core/server.ts` that accepts partial config, validates types against schemas, writes to disk, and broadcasts SSE `{ type: 'config', plugin: '<mode>' }`
- [x] 1.4 Add `getPluginConfig(mode)` helper to `DashboardService` so plugins can read their own config synchronously at init time
- [x] 1.5 Verify: `GET /__plugins/config` returns merged defaults when `plugins` key is absent

## 2. Backend: Bugs Plugin Migration & Rewire

- [x] 2.1 In `src/server/bugs.ts`, remove `BUGS_CONFIG_CANDIDATES`, `ZgoalConfig`, `loadConfig`, `YAML` import, and all `.zdev/config.yaml` / `.zgoal/config.yaml` references (including comments and error messages)
- [x] 2.2 In `src/plugins/bugs/web.tsx`, remove `zgoal` from the plugin description string
- [x] 2.3 Rewrite `fetchBugs(root)` to read config from `ctx.server.getPluginConfig('bugs')` instead of `loadConfig(root)`
- [x] 2.4 In server startup (e.g., `src/cli.ts`), add migration step: if `.zdev/config.yaml` exists and `plugins.bugs` is absent, parse YAML, write to `plugins.bugs`, delete `.zdev/config.yaml`; if `.zgoal/config.yaml` exists, delete it without reading; if YAML is invalid, log warning and delete it
- [x] 2.5 Verify: start server with existing `.zdev/config.yaml` → file is migrated and deleted, bugs plugin reads from dashboard.json

## 3. Backend: Design Plugin Multi-Folder Aggregation

- [x] 3.1 Rewrite `/__design/assets` in `src/plugins/design/index.ts` to read `plugins.design.folders` from server config, iterate each folder, call `scanAssets(root, folder)` for each, and merge results into a single response
- [x] 3.2 Remove old `?path=` query param parsing, `safeSub`, `altSub`, `resolved` fallback logic, and all compatibility branches
- [x] 3.3 Update `src/server/design-assets.ts` `scanAssets` to accept `subDir` and use it as scan root (keep existing signature, no breaking change)
- [x] 3.4 Verify: `plugins.design.folders = ["design", "playground/design"]` returns combined assets from both directories

## 4. Backend: View Plugin walkDir Config

- [x] 4.1 Update `src/server/walk.ts` `walkDir` to accept `options.showHidden` and `options.maxDepth`; skip dotfiles when `showHidden` is false; respect `maxDepth` limit
- [x] 4.2 Update `src/plugins/view/index.ts` to read `plugins.view.hiddenDirs`, `defaultExpandDepth`, `showHidden` from server config and pass to `walkDir` / `scanTree`
- [x] 4.3 Verify: setting `hiddenDirs: [".git"]` removes `.git` from the file tree

## 5. Frontend: Config Panel Infrastructure

- [x] 5.1 Create `src/web/components/ConfigField.tsx` — renders the correct input component based on schema `type` (`string`, `text`, `number`, `boolean`, `string[]`, `select`, `multiselect`)
- [x] 5.2 Create `src/web/hooks/usePluginConfig.ts` — fetches `GET /__plugins/config`, provides `config`, `save(config)`, `saving` state; debounces save (300ms)
- [x] 5.3 Verify: `ConfigField` renders all 7 types correctly in isolation

## 6. Frontend: Plugin Schema Registration

- [x] 6.1 Add `config` field to each plugin's `ctx.dashboard.register()` call:
  - `design`: `{ folders: { type: 'string[]', label: '扫描文件夹', default: [] } }`
  - `bugs`: `{ url: { type: 'string', label: '服务器 URL' }, account: { type: 'string', label: '账号' }, token: { type: 'string', label: 'Token' }, product: { type: 'number', label: '产品 ID' } }`
  - `view`: `{ hiddenDirs: { type: 'string[]', label: '隐藏目录', default: ['.git', 'node_modules', 'dist', 'build'] }, defaultExpandDepth: { type: 'number', label: '默认展开深度', default: 2 }, showHidden: { type: 'boolean', label: '显示隐藏文件', default: false } }`
- [x] 6.2 Verify: `GET /__plugins` returns manifests with `config` field for each plugin

## 7. Frontend: Design Plugin Sidebar Refactor

- [x] 7.1 Remove `localStorage` usage, `STORAGE_KEY`, `editing/draft` state, and single `scanRoot` state from `src/plugins/design/Sidebar.tsx`
- [x] 7.2 Add collapsible "⚙️ 配置" section at bottom of design Sidebar, using `usePluginConfig` hook and `ConfigField` components
- [x] 7.3 Render `folders` as a tag list with add/remove; each tag shows the folder name and a delete button
- [x] 7.4 On save, trigger `designState.setScanRoot` (or equivalent) to reload assets
- [x] 7.5 Remove `getScanRoot` / `setScanRoot` from `src/plugins/design/state.ts`
- [x] 7.6 Verify: entering "playground/design" in config panel and saving shows assets from that folder

## 8. Frontend: Bugs Plugin Sidebar Config

- [x] 8.1 Add collapsible "⚙️ 配置" section to bugs Sidebar with fields for `url`, `account`, `token`, `product`
- [x] 8.2 Verify: entering bug tracker URL and credentials saves to dashboard.json and bugs list loads

## 9. Frontend: View Plugin Sidebar Config

- [x] 9.1 Add collapsible "⚙️ 配置" section to view Sidebar with fields for `hiddenDirs` (tag input), `defaultExpandDepth` (number), `showHidden` (checkbox)
- [x] 9.2 Verify: adding ".cache" to `hiddenDirs` and saving removes `.cache` from file tree

## 10. Frontend: localStorage Migration

- [x] 10.1 In `usePluginConfig.ts` or a dedicated migration effect, check `localStorage.getItem('zd-design-scan-root')`; if non-empty, POST to `plugins.design.folders` and clear the key
- [x] 10.2 Verify: old localStorage value migrates to dashboard.json on first load, localStorage key is cleared

## 11. Cleanup & Verification

- [x] 11.1 Delete all dead code: `src/plugins/design/state.ts` `getScanRoot`/`setScanRoot`, `src/plugins/design/index.ts` `?path=` parsing, `src/server/bugs.ts` YAML code
- [x] 11.2 Run full build and verify no TypeScript errors
- [x] 11.3 Start server, verify config persists across restarts, verify hot reload works for all three plugins
- [x] 11.4 Delete `openspec/changes/2026-08-23-design-token-completion` if still present
