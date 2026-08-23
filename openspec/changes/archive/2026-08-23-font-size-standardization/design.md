## Context

Current theme system uses custom Tailwind font-size utilities `text-10`/`text-11` mapped to CSS variables `--text-10`/`--text-11`. These exist alongside standard `text-xs`/`text-sm`/`text-base`/`text-lg`, creating a split mental model. Components inconsistently use both naming schemes, and theme font tuning requires changing values in CSS plus hunting for non-standard class names across dozens of files.

## Goals / Non-Goals

**Goals:**
- All components use only standard Tailwind font-size classes (`text-xs`, `text-sm`, `text-base`, `text-lg`)
- Theme font-size differentiation happens entirely via overriding standard CSS variables (`--text-xs`, `--text-sm`, etc.)
- No component TSX needs modification when tuning theme font sizes

**Non-Goals:**
- Adding new font-size granularity beyond what Tailwind standard provides
- Changing component layout/spacing behavior
- Modifying icon sizing or border-radius system

## Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Use only Tailwind standard classes | Reduces cognitive load, avoids custom utility proliferation | Keep `text-10`/`text-11` but rename to semantic names like `text-ui-xs` |
| Override standard `--text-xs`/`--text-sm` in themes | Themes get size differentiation without component changes | Add new `--sidebar-font`/`--statusbar-font` semantic variables |
| Delete `--text-10`/`--text-11` entirely | Prevents accidental reuse, enforces standard-only invariant | Deprecate with comment, remove later |

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Visual regression in default theme (11px→12px for `text-sm`) | Visual review before merge |
| Pixel theme VT323 compensation interacts with new sizes | Test pixel theme specifically after changes |
| External consumers using `text-10`/`text-11` | Document breaking change in release notes |
