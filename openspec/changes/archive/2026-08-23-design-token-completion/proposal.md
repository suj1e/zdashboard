## Why

The font-size standardization change removed `text-10`/`text-11`, but a full design-token audit reveals remaining hardcoded values across icons, layout dimensions, border radius, and shadows. These break theme consistency: icons don't switch style per theme, layout sizes don't adapt, and radius/shadow tokens are only partially mapped. We need to complete the standardization so every visual dimension flows through CSS variables or `useIcons()`.

## What Changes

- Migrate all remaining hardcoded `lucide-react` imports to `useIcons()` hook (10 files, 13 import lines)
- Add missing icon mappings to `ICON_MAP` and theme renderers
- Replace hardcoded `rounded-[14px]` with `rounded-[var(--radius-lg)]`
- Map `rounded-xl` to CSS variable in Tailwind config
- Map `shadow-lg` to CSS variable in Tailwind config
- Replace hardcoded `text-[8px]`/`text-[9px]` with `text-xs` or new `--text-8`/`--text-9` variables
- Replace hardcoded layout dimensions (`h-[72px]`, `w-[280px]`, `w-[240px]`, `w-[50px]`, `h-[38px]`) with CSS variables or standard classes
- Replace hardcoded `p-[1px]` scrollbar padding with standard spacing

## Capabilities

### New Capabilities
- `design-token-completion`: Complete design token standardization covering icons, layout dimensions, border radius, shadows, and remaining font sizes

### Modified Capabilities
- `dashboard-platform`: Theme system now covers all visual dimensions — icons, layout sizes, radius, shadows, and typography are fully variable-driven

## Impact

- Affected files: 15+ component files, `src/web/lib/icons.tsx`, `tailwind.config.ts`, `globals.css`, theme CSS files
- No API changes, no new dependencies
- Visual changes: icons switch style per theme, layout sizes become themeable, radius/shadow consistency improves
