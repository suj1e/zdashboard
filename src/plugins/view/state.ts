let current: string | null = null;
const subs = new Set<(p: string | null) => void>();

export const viewState = {
  get: () => current,
  set: (p: string | null) => { current = p; subs.forEach(s => s(p)); },
  subscribe: (fn: (p: string | null) => void) => { subs.add(fn); return () => subs.delete(fn); },
};
