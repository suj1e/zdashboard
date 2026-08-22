import React from 'react';
import { ExternalWorkspace } from '../components/ExternalWorkspace';
import { PlaceholderWorkspace } from '../components/PlaceholderWorkspace';

export interface WebPlugin {
  mode: string;
  label: string;
  icon: string;
  description?: string;
  external?: boolean;
  Workspace: React.ComponentType<unknown> | React.LazyExoticComponent<React.ComponentType<unknown>>;
  Sidebar?: React.LazyExoticComponent<React.ComponentType<unknown>>;
}

const ORDER = ['stats', 'view', 'bugs', 'review', 'design', 'apply', 'just'];

export function usePlugins() {
  const [plugins, setPlugins] = React.useState<WebPlugin[]>([]);
  const [external, setExternal] = React.useState<WebPlugin[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const modules = import.meta.glob('../../plugins/*/web.tsx');
      const entries = Object.entries(modules);
      const loaded: WebPlugin[] = [];
      for (const [, loader] of entries) {
        try {
          const mod = (await loader()) as { default: WebPlugin };
          if (mod.default) loaded.push(mod.default);
        } catch (e) {
          console.error('[zdashboard] failed to load web plugin:', e);
        }
      }
      loaded.sort((a, b) => {
        const ai = ORDER.indexOf(a.mode);
        const bi = ORDER.indexOf(b.mode);
        if (ai === -1 && bi === -1) return a.mode.localeCompare(b.mode);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      if (!cancelled) setPlugins(loaded);
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/__plugins', { cache: 'no-store' });
        const data = await r.json();
        if (!cancelled) {
          const mapped = (data.plugins ?? []).map((p: any) => {
            if (p.viewerUrl) {
              const Wrapper = () => React.createElement(ExternalWorkspace, { viewerUrl: p.viewerUrl, label: p.label });
              return { ...p, Workspace: Wrapper } as WebPlugin;
            }
            const Placeholder = () => React.createElement(PlaceholderWorkspace, { label: p.label });
            return { ...p, Workspace: Placeholder } as WebPlugin;
          });
          setExternal(mapped.filter((p: WebPlugin) => !plugins.some((b) => b.mode === p.mode)));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [plugins]);

  return [...plugins, ...external];
}
