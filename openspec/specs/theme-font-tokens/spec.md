# theme-font-tokens Specification

## Purpose
Defines the font-size token conventions for the theme system. Ensures all themes use standard Tailwind font-size utilities and that component typography is controlled exclusively through CSS variables.

## Requirements

### Requirement: Standard font-size classes only
The UI component layer SHALL use only Tailwind standard font-size classes: `text-xs`, `text-sm`, `text-base`, `text-lg`. Custom classes such as `text-10`, `text-11`, `text-14` SHALL NOT appear in component source files.

#### Scenario: Component font-size audit
- **WHEN** a developer scans `src/web/components/` and `src/plugins/*/` for font-size classes
- **THEN** only `text-xs`, `text-sm`, `text-base`, `text-lg` are found; no numeric custom classes exist

### Requirement: Theme font-size overrides via standard variables
Each theme CSS file SHALL control font size by overriding the standard CSS variables: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`. Custom variables `--text-10`, `--text-11`, `--text-14` SHALL NOT be defined.

#### Scenario: Pixel theme font sizing
- **WHEN** `data-theme="pixel"` is active
- **THEN** `--text-xs` and `--text-sm` are overridden in `pixel.css` to produce larger readable text; no `--text-10`/`--text-11` variables exist

#### Scenario: Default theme font sizing
- **WHEN** `data-theme="default"` is active
- **THEN** `--text-xs: 0.75rem` (12px) and `--text-sm: 0.875rem` (14px) from `:root` apply

### Requirement: Tailwind config maps standard variables only
`tailwind.config.ts` SHALL map `text-xs`, `text-sm`, `text-base`, `text-lg` to their corresponding CSS variables. No entries for `10`, `11`, or `14` SHALL exist.

#### Scenario: Tailwind config audit
- **WHEN** a developer inspects `theme.extend.fontSize` in `tailwind.config.ts`
- **THEN** keys are only `xs`, `sm`, `base`, `lg`; no numeric keys exist
