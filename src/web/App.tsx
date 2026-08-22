import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Topbar } from './components/Topbar';
import { IconRail } from './layout/IconRail';
import { SidebarFrame } from './layout/SidebarFrame';
import { StatusBar } from './layout/StatusBar';
import { HomeGrid } from './home/HomeGrid';
import { usePlugins, type WebPlugin } from './lib/plugins';
import { useSSE } from './hooks/useSSE';

const dotBg: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
  backgroundSize: '20px 20px',
};

interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean }

export default function App() {
  const plugins = usePlugins();
  const [mode, setMode] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState('');
  const stoppedRef = useRef(false);
  const [detect, setDetect] = useState<Detects>({ hasOpenspec: false, hasDocs: false, hasJust: false, hasBugs: false });

  const status = useSSE(
    () => { window.location.reload(); },
    () => {},
    stoppedRef
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/__config', { cache: 'no-store' });
        const cfg = await r.json();
        if (cancelled) return;
        setProjectPath(cfg.root ?? '');
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/__files', { cache: 'no-store' });
        const data = await r.json();
        if (!cancelled) setDetect({ hasOpenspec: data.hasOpenspec, hasDocs: data.hasDocs, hasJust: data.hasJust, hasBugs: data.hasBugs });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback((m: string | null) => {
    setMode(m);
    if (m === null) {
      window.location.hash = '';
    } else {
      window.location.hash = m;
    }
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      if (!h || h === 'home') {
        setMode(null);
      } else if (plugins.some((p) => p.mode === h)) {
        setMode(h);
      }
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [plugins]);

  const plugin = mode ? plugins.find((p) => p.mode === mode) : null;

  return (
    <div className="flex h-screen flex-col">
      <Topbar status={status} stoppedRef={stoppedRef} />
      <div className="flex-1 min-h-0 flex">
        <IconRail active={mode} onSelect={handleSelect} plugins={plugins.map((p) => ({ mode: p.mode, label: p.label, icon: p.icon }))} />
        {plugin?.Sidebar && (
          <SidebarFrame mode={mode}>
            <Suspense fallback={<div className="w-full h-full" />}>
              <plugin.Sidebar />
            </Suspense>
          </SidebarFrame>
        )}
        <section className="flex-1 min-h-0" style={dotBg}>
          <div className="h-full p-6">
            {mode && plugin ? (
              <Suspense fallback={
                <div className="flex h-full items-center justify-center text-muted-foreground text-xs">加载工作区…</div>
              }>
                <plugin.Workspace />
              </Suspense>
            ) : (
              <HomeGrid plugins={plugins} detect={detect} onSelect={handleSelect} />
            )}
          </div>
        </section>
      </div>
      <StatusBar projectPath={projectPath} stoppedRef={stoppedRef} />
    </div>
  );
}

