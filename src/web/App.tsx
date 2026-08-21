import { useCallback, useEffect, useRef, useState } from 'react';
import { Topbar } from './components/Topbar';
import { IconRail } from './layout/IconRail';
import { StatusBar } from './layout/StatusBar';
import { HomeGrid } from './home/HomeGrid';
import { usePlugins, type WebPlugin } from './lib/plugins';
import type { ConnStatus } from './hooks/useSSE';

export default function App() {
  const plugins = usePlugins();
  const [mode, setMode] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState('');
  const stoppedRef = useRef(false);
  const [status, setStatus] = useState<ConnStatus>('connecting');

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

  // SSE status for Topbar (hook via custom event from useSSE in StatusBar)
  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent<{ status: ConnStatus }>).detail;
      if (detail?.status) setStatus(detail.status);
    };
    window.addEventListener('zdashboard-sse-status', onStatus as EventListener);
    return () => window.removeEventListener('zdashboard-sse-status', onStatus as EventListener);
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

  const ActiveWorkspace = mode ? plugins.find((p) => p.mode === mode)?.Workspace : null;

  return (
    <div className="flex h-screen flex-col">
      <Topbar status={status} stoppedRef={stoppedRef} />
      <div className="flex-1 min-h-0 flex">
        <IconRail active={mode} onSelect={handleSelect} plugins={plugins.map((p) => ({ mode: p.mode, label: p.label, icon: p.icon }))} />
        <section className="flex-1 min-h-0 flex flex-col">
          {mode && ActiveWorkspace ? (
            <ActiveWorkspace />
          ) : (
            <div className="flex-1 min-h-0 overflow-auto p-6">
              <HomeGrid plugins={plugins} detect={{ hasOpenspec: true, hasDocs: true, hasJust: false, hasBugs: false }} onSelect={handleSelect} />
            </div>
          )}
        </section>
      </div>
      <StatusBar projectPath={projectPath} stoppedRef={stoppedRef} />
    </div>
  );
}
