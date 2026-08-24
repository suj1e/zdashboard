# design-token-completion Specification

## Purpose
Defines the complete design token standardization contract: all visual dimensions (icons, layout, radius, shadows, typography) SHALL be controlled through CSS variables or theme-aware hooks, not hardcoded pixel values in component source files.

## Requirements

### Requirement: All icons use theme-aware renderers
The UI component layer SHALL render icons exclusively through the `useIcons()` hook. Direct `lucide-react` imports for inline icons SHALL NOT appear in component source files.

#### Scenario: Icon theme switching
- **WHEN** user switches from default to pixel to slate theme
- **THEN** all icons in Sidebar, StatusBar, LogViewer, and plugin viewers switch style (lucide → pixelarticons → phosphor)

#### Scenario: Icon audit
- **WHEN** a developer scans `src/plugins/` and `src/web/` for `from 'lucide-react'`
- **THEN** only `src/web/lib/icons.tsx` contains the import; all component files use `useIcons()`

### Requirement: Layout dimensions use CSS variables
Fixed layout dimensions (`h-[72px]`, `w-[280px]`, etc.) SHALL be replaced with CSS custom properties or standard Tailwind classes.

#### Scenario: Sidebar width themeability
- **WHEN** a theme overrides `--sidebar-w`
- **THEN** the sidebar width changes across all breakpoints without TSX modifications

### Requirement: Border radius fully variable-driven
All border radius values SHALL flow through `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full` variables. Hardcoded `rounded-[14px]` and unmapped `rounded-xl` SHALL NOT exist.

#### Scenario: Radius token audit
- **WHEN** a developer inspects component TSX files for radius classes
- **THEN** only `rounded-[var(--radius-*)]` or mapped standard classes (`rounded-sm/md/lg/xl/full`) are found

### Requirement: Shadows fully variable-driven
All shadow values SHALL flow through `--shadow-sm`, `--shadow-md`, `--shadow-lg` variables. `shadow-sm`/`shadow-md`/`shadow-lg` classes SHALL map to these variables in Tailwind config.

#### Scenario: Shadow theme switching
- **WHEN** pixel theme sets `--shadow-sm: none` and `--shadow-md: none`
- **THEN** all `shadow-sm`/`shadow-md` usages disappear; slate/default themes show shadows via variable values

### Requirement: No hardcoded font-size pixel values
Component source files SHALL NOT contain `text-[8px]`, `text-[9px]`, or similar hardcoded font-size utilities. Exceptions require explicit CSS variable definition.

#### Scenario: Font-size audit
- **WHEN** a developer runs `grep -rn "text-\[[0-9]\+px\]" src/`
- **THEN** zero results are returned from component TSX files
