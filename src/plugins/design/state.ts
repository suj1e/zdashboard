import type { AssetType } from '../../../server/design-assets.js';

let current: { path: string; type: AssetType } | null = null;
const subs = new Set<(p: { path: string; type: AssetType } | null) => void>();

export const designState = {
  get: () => current,
  set: (p: { path: string; type: AssetType } | null) => { current = p; subs.forEach(s => s(p)); },
  subscribe: (fn: (p: { path: string; type: AssetType } | null) => void) => { subs.add(fn); return () => { subs.delete(fn); }; },
};
