## Context

See `proposal.md` for motivation. Current state: plugins receive only `{ root }`, configuration is scattered across YAML files, localStorage, and inline query params. No unified config surface exists.

## Goals / Non-Goals

**Goals:**
- Each plugin declares its own config schema at registration time
- `.zdev/dashboard.json` is the single source of truth for all plugin configuration
- Sidebar renders a per-plugin config panel driven by that plugin's schema
- Config changes hot-reload the relevant plugin without restarting the server
- One-shot migration of existing config (`.zdev/config.yaml`, `localStorage`) into the new format, then delete old code

**Non-Goals:**
- No config versioning / undo history
- No config validation beyond type checking and path existence
- No plugin marketplace or dynamic plugin discovery beyond the existing built-in list
- No per-user config (single-user, project-scoped only)

## Decisions

### 1. Config Schema Declaration

Plugins declare config inline when registering:

```ts
ctx.dashboard.register({
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  config: {
    folders: { type: 'string[]', label: '扫描文件夹', default: [] },
  },
});
```

**Rationale:** Keeps config close to the plugin that uses it. New plugins get config "for free" by adding a `config` field. No separate registry or discovery step needed.

**Alternatives considered:**
- Central registry file listing all plugin schemas — rejected because it fragments ownership
- Config-as-code (`.zdev/plugins/design.json` per plugin) — rejected because it creates file proliferation without benefit

### 2. Storage: `.zdev/dashboard.json`

Extend the existing instance record file with a `plugins` key:

```json
{
  "pid": 12345,
  "port": 4190,
  "root": "...",
  "startedAt": "...",
  "plugins": {
    "design": { "folders": ["design", "proto/design"] },
    "bugs": { "url": "https://...", "account": "...", "token": "...", "product": 1 }
  }
}
```

**Rationale:** Single file, atomic writes, already tracked by the instance lifecycle system. Adding a separate `plugins.json` would split logically related state.

**Alternatives considered:**
- Separate `.zdev/plugins.json` — rejected to minimize file count
- SQLite / JSONL — overkill for project-scoped, single-user config

### 3. Config API

Two new server endpoints:

- `GET /__plugins/config` — returns `{ [mode]: { [key]: value } }` merged with defaults
- `POST /__plugins/config` — accepts partial config, validates against schema, writes file, broadcasts SSE

**Rationale:** Simple request/response. Frontend fetches all config on mount; saves are batched.

**Alternatives considered:**
- Per-plugin endpoints (`/__design/config`, `/__bugs/config`) — rejected because it scatters API surface
- GraphQL — rejected as overkill

### 4. Hot Reload via SSE

After `POST /__plugins/config` writes the file, the server broadcasts on `__reload` SSE channel with `{ type: 'config', plugin: 'design' }`. Each plugin subscribes to SSE and reloads its own config when it sees its own plugin name.

**Rationale:** Reuses existing SSE infrastructure. Plugins already have lifecycle hooks (`ctx.effect`) for cleanup.

**Alternatives considered:**
- Polling `/__plugins/config` — rejected as wasteful
- WebSocket — rejected because SSE already exists and is sufficient

### 5. Sidebar Config Panel

Each plugin's Sidebar component renders a collapsible "⚙️ 配置" section at the bottom. The panel is driven by the plugin's `config` schema:

- `string` / `text` → `<input>` / `<textarea>`
- `number` → `<input type="number">`
- `boolean` → `<input type="checkbox">`
- `string[]` → tag input with add/remove
- `select` → `<select>`
- `multiselect` → checkbox group

Plugins with no `config` field show "此插件暂无配置项".

**Rationale:** Config lives next to the plugin it configures. Users don't need to navigate to a separate settings page.

**Alternatives considered:**
- Global settings page — rejected because it hides config from the plugin context
- Modal dialog — rejected because it interrupts workflow

### 6. One-Shot Migration

On server startup, before plugins load:

1. Check if `.zdev/config.yaml` exists
2. If yes, parse it and merge into `dashboard.json → plugins.bugs`
3. Delete `.zdev/config.yaml`
4. Check `localStorage` for `zd-design-scan-root` (frontend side) — if found, migrate to `dashboard.json → plugins.design.folders` and clear the key

After migration, all old code paths are deleted.

**Rationale:** Project is pre-release, no production users. Clean break is simpler than maintaining dual paths.

**Alternatives considered:**
- Maintain backward compatibility indefinitely — rejected because it adds permanent maintenance burden for zero users

### 7. view Plugin walkDir Config

`walkDir` currently takes a `skip` set hardcoded by each caller. Change it to accept an options object:

```ts
walkDir(root, {
  skip: new Set(cfg.hiddenDirs),
  maxDepth: cfg.defaultExpandDepth,
  showHidden: cfg.showHidden,
  onFile,
});
```

**Rationale:** Single walk implementation, configurable per-call. View plugin is the first consumer; design plugin's `scanAssets` can reuse it.

## Risks / Trade-offs

- **[Config file corruption]** → Mitigation: write to temp file then `rename` for atomicity; validate schema on read
- **[SSE race: plugin loads before config broadcast]** → Mitigation: plugins read config synchronously from server on init, then subscribe to SSE for live updates
- **[Path traversal in folder config]** → Mitigation: server validates all folder paths are within project root before scanning
- **[Large config writes on every keystroke]** → Mitigation: frontend debounces saves (300ms), only sends on blur or explicit save

## Migration Plan

1. Add `plugins` field parsing/writing to `instance.ts`
2. Add `GET /__plugins/config` and `POST /__plugins/config` to `server.ts`
3. Add migration step in CLI startup: YAML → dashboard.json, then delete YAML (including `.zgoal/config.yaml`)
4. Update each plugin's `register()` to include `config` schema
5. Update each plugin's Sidebar to render config panel
6. Delete old compat code: `localStorage` key `zd-design-scan-root`, `?path=` fallback in design, `BUGS_CONFIG_CANDIDATES` / `ZgoalConfig` / `loadConfig` / YAML parsing in bugs, `.zgoal` references in `bugs/web.tsx`
7. Frontend: migrate `localStorage` → `dashboard.json` on first load, clear key
8. Test: start server, verify config persists across restarts, verify hot reload

## Open Questions

- Should `POST /__plugins/config` require `x-stop-token`? Likely yes, since it writes to disk.
- Should config be namespaced per-plugin on the frontend, or flat-merged? Namespaced is cleaner (`plugins.design.folders` vs `designFolders`).