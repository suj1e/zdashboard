## Why

每个插件目前只收到 `{ root }`，没有任何用户可配项。design 插件要支持多文件夹扫描、bugs 插件要配置禅道凭据、view 插件要控制目录过滤——这些需求都堵在"没有地方存、没有界面管"上。现在做一个统一配置中心，插件自己声明 schema，侧边栏原生承载配置面板，一劳永逸。

## What Changes

- 插件注册时声明 `config` schema（类型：`string` / `text` / `number` / `boolean` / `string[]` / `select` / `multiselect`）
- `.zdev/dashboard.json` 新增 `plugins` 段，统一持久化所有插件配置
- 侧边栏内置配置面板：每个插件在自己的 Sidebar 底部渲染可折叠的 config form，由 schema 自动驱动
- **design 插件**：扫描文件夹从单值改为多值 `string[]`，服务端聚合多路径扫描结果
- **bugs 插件**：配置从 `.zdev/config.yaml` 迁入 `dashboard.json` → `plugins.bugs`，启动时做一次迁移然后删掉旧文件
- **view 插件**：新增 `hiddenDirs` / `defaultExpandDepth` / `showHidden` 配置，`walkDir` 读配置而非硬编码
- 后端新增 `GET /__plugins/config`（返回 schema + 当前值）和 `POST /__plugins/config`（写入 + SSE 广播）
- **BREAKING**：一次性删除所有旧兼容代码，不留后路：
  - `.zdev/config.yaml` 和 `.zgoal/config.yaml` 不再被读取；bugs 插件启动时迁移旧 YAML 到 `dashboard.json` 后删除该文件
  - `localStorage` 中的 `zd-design-scan-root` 废弃不再读取；design 的 `getScanRoot` / `setScanRoot` 从 `state.ts` 删除
  - design 的 `?path=` 单值查询参数废弃，改为服务端聚合多文件夹
  - `dashboard.json` 的实例记录（`pid/port/root/startedAt`）保留，但 `plugins` 段成为配置唯一持久化位置
  - `src/server/bugs.ts` 中的 `BUGS_CONFIG_CANDIDATES`、`ZgoalConfig`、`loadConfig`、`YAML` 解析全部删除；移除所有 `.zdev/config.yaml` 和 `.zgoal/config.yaml` 引用（包括注释和错误信息）
  - `src/plugins/bugs/web.tsx` 中 description 里的 `zgoal` 引用删除
  - `src/plugins/design/index.ts` 中的 `pathParam` / `safeSub` / `altSub` 回退逻辑全部删除
  - `src/plugins/design/Sidebar.tsx` 中的 `editing/draft` 单输入框 UI 全部删除，改为 config panel 中的列表编辑器
  - 所有 `skip_specs` / 旧版本兼容分支一次性清掉

## Capabilities

### New Capabilities

- `plugin-config-center`: 插件自描述配置系统——schema 声明、侧边栏配置面板、统一存储与热重载

## Impact

- `src/plugins/*/index.ts`：每个插件的 `ctx.dashboard.register()` 新增 `config` 字段
- `src/plugins/design/index.ts`：`/__design/assets` 改为服务端聚合多文件夹，删除 `?path=` 兼容逻辑
- `src/plugins/bugs/index.ts`：不再读 `.zdev/config.yaml`，改为读 `ctx.server.getPluginConfig('bugs')`
- `src/plugins/view/index.ts` + `src/server/walk.ts`：walk 选项读配置，删除硬编码 `SKIP` set
- `src/core/instance.ts` / `src/core/server.ts`：新增 config 读写 API 与 SSE 广播
- `src/plugins/*/Sidebar.tsx`：每个插件的 Sidebar 增加可折叠配置面板
- `src/server/bugs.ts`：删除 YAML 解析代码，改为读 server config
- `.zdev/dashboard.json` schema 变更（新增 `plugins` 段）
- `.zdev/config.yaml` 废弃并在迁移后删除
