## Context

The previous font-size standardization change removed `text-10`/`text-11` and established CSS variables for standard sizes. However, a design-token audit (`design-token-audit-report.md`) reveals incomplete coverage in four areas: icons, layout dimensions, border radius, and shadows. This change completes the standardization.

## Goals / Non-Goals

**Goals:**
- All icons render through `useIcons()` hook, enabling per-theme icon styles
- All layout dimensions use CSS variables or standard Tailwind classes
- All border radius values flow through `--radius-*` variables
- All shadow values flow through `--shadow-*` variables
- No hardcoded pixel values remain in component TSX files

**Non-Goals:**
- Adding new icon sets beyond lucide/pixelarticons/phosphor
- Changing component layout/spacing behavior
- Adding responsive breakpoint tokens

## Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Migrate all icons to `useIcons()` | Enables theme-specific icon styles (lucide/pixelarticons/phosphor) | Keep lucide imports for complex icons |
| Add `--radius-xl` variable | `rounded-xl` is used in card.tsx and needs mapping | Replace `rounded-xl` with `rounded-lg` everywhere |
| Add `--shadow-lg` variable | `shadow-lg` is used in SidebarFrame | Replace `shadow-lg` with `shadow-md` |
| Replace `text-[8px]`/`text-[9px]` with `text-xs` | These are edge cases; `text-xs` (12px) is acceptable | Add `--text-8`/`--text-9` variables |
| Replace `w-[280px]` with `w-[var(--sidebar-w)]` | Sidebar width should be themeable | Keep hardcoded, document as exception |

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Icon mapping gaps cause missing icons | Verify all ICON_MAP entries before merging |
| Layout dimension changes break visual design | Visual review per theme after changes |
| `text-[8px]` → `text-xs` increases size | Acceptable; these were edge cases |
