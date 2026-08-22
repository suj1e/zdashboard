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

interface NavTarget { mode?: string; filter?: string; wt?: string; navToken?: number; }

interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean }

export default function App() {
  const plugins = usePlugins();
  const [mode, setMode] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState('');
  const stoppedRef = useRef(false);
  const [detect, setDetect] = useState<Detects>({ hasOpenspec: false, hasDocs: false, hasJust: false, hasBugs: false });
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);

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
    setNavTarget(null);
    if (m === null) {
      window.location.hash = '';
    } else {
      window.location.hash = m;
    }
  }, []);

  useEffect(() => {
    const onNav = (ev: Event) => {
      const detail = (ev as CustomEvent<NavTarget>).detail;
      if (!detail?.mode) return;
      // 递增 token:每次导航强制目标插件重挂载(filter 预填/聚焦不因 stale state 失效),并让消费方识别新目标
      setNavTarget({ ...detail, navToken: Date.now() });
      setMode(detail.mode);
      window.location.hash = detail.mode;
    };
    window.addEventListener('zd-dashboard-nav', onNav);
    return () => window.removeEventListener('zd-dashboard-nav', onNav);
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

  // navTarget 透传依赖 navToken 作 key 强制重挂载;不再需要 workspaceProps 中间件


  return (
    <div className="flex h-screen flex-col">
      <Topbar status={status} stoppedRef={stoppedRef} />
      <div className="flex-1 min-h-0 flex">
        <IconRail active={mode} onSelect={handleSelect} plugins={plugins.map((p) => ({ mode: p.mode, label: p.label, icon: p.icon }))} />
        <SidebarFrame mode={mode ?? 'home'} hasContent={!!plugin?.Sidebar}>
          {plugin?.Sidebar ? (
            <Suspense fallback={<div className="w-full h-full" />}>
              <div key={mode} className="h-full animate-in fade-in slide-in-from-left-1 duration-200">
                <plugin.Sidebar key={navTarget?.navToken ?? 'side'} navTarget={navTarget} />
              </div>
            </Suspense>
          ) : null}
        </SidebarFrame>
        <section className="flex-1 min-h-0" style={dotBg}>
          <div className="h-full p-6">
            {mode && plugin ? (
              <Suspense fallback={
                <div className="mx-auto h-full max-w-6xl rounded-lg border bg-background shadow-sm animate-pulse" />
              }>
                <div key={mode} className="h-full animate-in fade-in duration-200">
                  <plugin.Workspace key={navTarget?.navToken ?? 'ws'} {...(navTarget ? { navTarget } : {})} />
                </div>
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
