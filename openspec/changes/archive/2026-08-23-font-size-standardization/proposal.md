## Why

The theme system currently uses non-standard Tailwind font-size classes (`text-10`, `text-11`) alongside standard ones (`text-xs`, `text-sm`). This creates confusion, makes theme tuning harder, and forces developers to hunt through many files when adjusting component typography. We need a clean, standard-only approach where themes control size via CSS variables and components use Tailwind's native class names.

## What Changes

- Remove all `text-10` / `text-11` / `text-14` CSS custom properties from globals and theme files
- Remove `text-10` / `text-11` mappings from `tailwind.config.ts`
- Replace every `text-10` / `text-11` usage in components with `text-xs` / `text-sm`
- Theme font-size differentiation happens entirely inside theme CSS by overriding the standard `--text-xs` / `--text-sm` / `--text-base` / `--text-lg` variables
- **BREAKTING**: Any external code referencing `text-10` / `text-11` will break; these were internal-only

## Capabilities

### New Capabilities
- `theme-font-tokens`: Font size token standardization across default/pixel/slate themes

### Modified Capabilities
- `dashboard-platform`: Theme system CSS variable conventions change — components must use standard Tailwind font-size classes only

## Impact

- Affected files: `src/web/globals.css`, `src/web/themes/*.css`, `tailwind.config.ts`, all components under `src/web/components/` and `src/plugins/*/`
- No API changes, no new dependencies
- Visual change: default theme font sizes shift slightly (e.g., what was `text-11` becomes `text-sm` at 0.875rem instead of 11px)
