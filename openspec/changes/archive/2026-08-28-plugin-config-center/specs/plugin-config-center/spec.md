## Purpose

Provides a unified, plugin-self-describing configuration system where each plugin declares its own config schema, the sidebar renders a per-plugin config panel, and all configuration is persisted in `.zdev/dashboard.json` with hot-reload support.

## ADDED Requirements

### Requirement: Plugin config schema declaration

Each plugin SHALL declare an optional `config` field in its `ctx.dashboard.register()` manifest. The `config` field SHALL be a map of `{ [key]: ConfigField }`, where `ConfigField` has a `type` (`string` | `text` | `number` | `boolean` | `string[]` | `select` | `multiselect`), a `label`, and an optional `default`. Plugins without a `config` field SHALL display "此插件暂无配置项" in their sidebar config panel.

#### Scenario: Plugin with config renders form fields
- **WHEN** a plugin registers with `config: { folders: { type: 'string[]', label: '扫描文件夹', default: [] } }`
- **THEN** the sidebar config panel SHALL render a tag-input field labeled "扫描文件夹" with an empty list as the initial value

#### Scenario: Plugin without config shows placeholder
- **WHEN** a plugin registers with no `config` field (e.g., `just` plugin)
- **THEN** the sidebar config panel SHALL display "此插件暂无配置项" and no form fields

#### Scenario: Default values fill empty storage
- **WHEN** `.zdev/dashboard.json` has no `plugins` section or is missing a key for a registered plugin
- **THEN** the server SHALL return the plugin's declared `default` for each missing key

### Requirement: Config persistence in dashboard.json

The server SHALL persist all plugin configuration in `.zdev/dashboard.json` under the `plugins` key. Writes SHALL be atomic (write to temp file then `rename`). Reads SHALL merge stored values with plugin defaults. The `plugins` key SHALL be initialized to `{}` if absent.

#### Scenario: Save writes to disk atomically
- **WHEN** user clicks save in a plugin config panel
- **THEN** the server writes to a temp file and renames it into place; if the process crashes mid-write, the original file SHALL remain intact

#### Scenario: Missing key falls back to default
- **WHEN** stored config has `{ design: { folders: ["a"] } }` but the schema declares `default: []` for `folders`
- **THEN** `GET /__plugins/config` SHALL return `{ design: { folders: ["a"] } }` (stored value wins)

### Requirement: Config hot reload via SSE

After a successful `POST /__plugins/config`, the server SHALL broadcast an SSE event on the `__reload` channel with `{ type: 'config', plugin: '<mode>' }`. Each plugin SHALL subscribe to `__reload` and reload its own config when it receives an event matching its `mode`.

#### Scenario: Design plugin reloads folders on config change
- **WHEN** user saves a new `folders` list for the `design` plugin
- **THEN** the design plugin SHALL receive an SSE event and re-scan all configured folders within 1 second

#### Scenario: Unrelated plugin ignores other plugins' config events
- **WHEN** the `bugs` plugin config is saved
- **THEN** the `design` plugin SHALL NOT reload its config

### Requirement: Multi-folder design scanning

The `design` plugin SHALL support scanning multiple folders. The server SHALL aggregate results from all configured folders into a single response. Each asset's `path` SHALL be relative to the project root. Duplicate filenames across different folders SHALL be preserved with their distinct paths.

#### Scenario: Multiple folders produce combined asset list
- **WHEN** `plugins.design.folders` is `["design", "proto/design"]`
- **THEN** `GET /__design/assets` SHALL return assets from both directories combined, with paths like `design/index.html` and `proto/design/tokens/theme.css`

#### Scenario: Empty folders list scans project root
- **WHEN** `plugins.design.folders` is `[]` or absent
- **THEN** `GET /__design/assets` SHALL scan the project root

### Requirement: Bugs config migration

On server startup, if `.zdev/config.yaml` exists and `plugins.bugs` is absent from `dashboard.json`, the server SHALL migrate the YAML content into `plugins.bugs` and delete `.zdev/config.yaml`. If both exist, the YAML file SHALL be deleted without overwriting existing config. After migration, the server SHALL NOT read `.zdev/config.yaml` again.

#### Scenario: Fresh migration on first start
- **WHEN** `.zdev/config.yaml` exists with valid bug config and `.zdev/dashboard.json` has no `plugins.bugs`
- **THEN** on startup, the server SHALL create `plugins.bugs` from the YAML content and delete `.zdev/config.yaml`

#### Scenario: No migration if config already exists
- **WHEN** `.zdev/config.yaml` exists but `plugins.bugs` is already in `dashboard.json`
- **THEN** the server SHALL delete `.zdev/config.yaml` without reading it

#### Scenario: Invalid YAML is ignored
- **WHEN** `.zdev/config.yaml` exists but is malformed or missing required fields
- **THEN** the server SHALL log a warning, leave `plugins.bugs` absent, and delete the file

### Requirement: View plugin directory filtering

The `view` plugin SHALL support `hiddenDirs` (string array), `defaultExpandDepth` (number), and `showHidden` (boolean) config options. The file tree walker SHALL skip directories in `hiddenDirs`, expand to `defaultExpandDepth` levels by default, and include dotfiles only when `showHidden` is `true`.

#### Scenario: Hidden directories are excluded from tree
- **WHEN** `plugins.view.hiddenDirs` is `[".git", "node_modules"]`
- **THEN** the file tree SHALL not contain `.git` or `node_modules` nodes

#### Scenario: Show hidden respects flag
- **WHEN** `plugins.view.showHidden` is `false`
- **THEN** files and directories starting with `.` SHALL be excluded (except those in `hiddenDirs` which are always excluded)

### Requirement: Frontend localStorage migration

On first load, if `localStorage.getItem('zd-design-scan-root')` returns a non-empty value, the frontend SHALL migrate it to `plugins.design.folders` (as a single-element array), clear the localStorage key, and reload config from the server.

#### Scenario: Migrate old scan root to new config
- **WHEN** `localStorage` has `zd-design-scan-root = "playground/design"` and `plugins.design` is absent
- **THEN** the frontend SHALL POST `{ design: { folders: ["playground/design"] } }`, clear the localStorage key, and re-render the sidebar

## REMOVED Requirements

### Requirement: Single scan root via localStorage

**Reason**: Replaced by multi-folder config in `dashboard.json`.

**Migration**: Value is auto-migrated to `plugins.design.folders` on first load, then the localStorage key is cleared.

### Requirement: YAML-based bugs config

**Reason**: Replaced by unified `dashboard.json` config. Both `.zdev/config.yaml` and `.zgoal/config.yaml` are no longer read.

**Migration**: Server auto-migrates `.zdev/config.yaml` to `plugins.bugs` on startup, then deletes the YAML file. `.zgoal/config.yaml` is deleted without reading if present.

### Requirement: Design assets single-path query param

**Reason**: Replaced by server-side multi-folder aggregation.

**Migration**: The `?path=` query param on `/__design/assets` is removed; folders are now configured in `plugins.design.folders`.
