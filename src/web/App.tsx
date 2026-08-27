import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Topbar } from './components/Topbar';
import { IconRail } from './layout/IconRail';
import { SidebarFrame } from './layout/SidebarFrame';
import { StatusBar } from './layout/StatusBar';
import { HomeGrid } from './home/HomeGrid';
import { usePlugins } from './lib/plugins';
import { useRoute } from './router';
import { useSSE } from './hooks/useSSE';

interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean }

export default function App() {
  const plugins = usePlugins();
  const route = useRoute();
  const requestedMode = route.plugin;
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

  // 非法 ?p=xxx(注册表中不存在)回落首页;插件列表加载完成前先尊重 URL 值避免闪烁
  const known = plugins.length === 0 || !requestedMode
    ? requestedMode
    : (plugins.some((p) => p.mode === requestedMode) ? requestedMode : null);
  const plugin = known ? plugins.find((p) => p.mode === known)! : null;

  // 唯一导航出口:URL params(p 键增删即进/出插件)
  const handleSelect = useCallback((m: string | null) => {
    route.navigate(m === null ? { p: null } : { p: m });
  }, [route]);

  return (
    <div className="flex h-screen flex-col">
      <Topbar status={status} stoppedRef={stoppedRef} />
      <div className="flex-1 min-h-0 flex">
        <IconRail active={known} onSelect={handleSelect} plugins={plugins.map((p) => ({ mode: p.mode, label: p.label, icon: p.icon }))} />
        <SidebarFrame mode={known ?? 'home'} hasContent={!!plugin?.Sidebar}>
          {plugin?.Sidebar ? (
            <Suspense fallback={<div className="w-full h-full" />}>
              <div key={known} className="h-full animate-in fade-in slide-in-from-left-1 duration-200">
                <plugin.Sidebar />
              </div>
            </Suspense>
          ) : null}
        </SidebarFrame>
        <section className="flex-1 min-h-0 dot-grid">
          <div className="h-full p-6">
            {known && plugin ? (
              <Suspense fallback={
                <div className="mx-auto h-full max-w-6xl rounded-lg border bg-background shadow-sm animate-pulse" />
              }>
                <div key={known} className="h-full animate-in fade-in duration-200">
                  <plugin.Workspace />
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
