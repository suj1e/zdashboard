import { useRef, useState, useEffect, useCallback } from 'react';
import { useSSE } from './hooks/useSSE';
import { Topbar } from './components/Topbar';
import { FileTree } from './components/FileTree';
import { LogViewer } from './components/LogViewer';
import { MdViewer } from './viewers/MdViewer';
import { ImageViewer } from './viewers/ImageViewer';
import { UnsupportedViewer } from './viewers/UnsupportedViewer';
import { showError } from './components/Toast';
import type { DashboardPlugin } from '@/server/plugins';
import type { CurrentView } from './lib/types';

type Current = CurrentView;

async function loadPlugin(mode: string): Promise<DashboardPlugin | null> {
  try {
    const mod = await import(`../../plugins/${mode}/index.js`);
    return mod.default ?? null;
  } catch (e) {
    console.error(`[zdashboard] failed to load plugin ${mode}:`, e);
    showError(`加载插件 ${mode} 失败`);
    return null;
  }
}

function viewerFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return MdViewer;
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return ImageViewer;
  return UnsupportedViewer;
}

export default function App() {
  const stopped = useRef(false);
  const [current, setCurrent] = useState<Current>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [treeOpen, setTreeOpen] = useState(true);
  const [mode, setMode] = useState<string>('view');
  const [plugins, setPlugins] = useState<DashboardPlugin[]>([]);
  const [pluginViewer, setPluginViewer] = useState<React.ComponentType | null>(null);
  const [pluginLoading, setPluginLoading] = useState(false);
  const status = useSSE(() => {}, () => setRefreshKey(k => k + 1), stopped);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const modes = ['view', 'bugs', 'review', 'design'];
      const loaded = await Promise.all(modes.map(loadPlugin));
      if (!cancelled) setPlugins(loaded.filter(Boolean) as DashboardPlugin[]);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPluginLoading(true);
      try {
        const plugin = await loadPlugin(mode);
        if (!cancelled && plugin?.viewer) {
          const { default: Viewer } = await plugin.viewer();
          setPluginViewer(() => Viewer);
        } else {
          setPluginViewer(null);
        }
      } finally {
        if (!cancelled) setPluginLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const Viewer = current?.kind === 'file' ? viewerFor(current.path) : null;
  const ActivePluginViewer = pluginViewer;
  const activePlugin = plugins.find(p => p.mode === mode);
  const barTitle = current?.kind === 'log' ? '服务日志 · just' : current?.kind === 'plugin' ? `${current.icon} ${current.label}` : current?.kind === 'file' ? current.path : '';
  const dotBg = { backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '20px 20px' };

  const onSelectPlugin = useCallback((m: string, label: string, icon: string) => {
    setMode(m);
    setCurrent({ kind: 'plugin', mode: m, label, icon });
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Topbar status={status} stoppedRef={stopped} treeOpen={treeOpen} onTreeToggle={() => setTreeOpen(o => !o)} />
      <main className="flex-1 min-h-0 flex relative">
        <FileTree
          open={treeOpen}
          currentPath={current?.kind === 'file' ? current.path : null}
          onSelectFile={path => setCurrent({ kind: 'file', path })}
          onSelectLog={() => setCurrent({ kind: 'log' })}
          onSelectPlugin={onSelectPlugin}
          plugins={plugins}
          activeMode={mode}
          refreshKey={refreshKey}
        />
        {treeOpen && <div className="absolute inset-0 z-10 bg-black/40 sm:hidden" onClick={() => setTreeOpen(false)} />}
        <section className="flex-1 min-h-0 flex flex-col">
          {current ? (
            <>
              <div className="h-[38px] flex-none flex items-center justify-between px-3.5 border-b bg-background text-xs">
                <span className="font-mono truncate">{barTitle}</span>
                <span className="text-muted-foreground ml-3 flex-none">
                  {current.kind === 'log' ? '日志' : current.kind === 'plugin' ? current.label : '文档'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-auto p-6 relative" style={dotBg}>
                {current.kind === 'log' ? (
                  <div className="h-full"><LogViewer /></div>
                ) : current.kind === 'plugin' && pluginLoading ? (
                  <div className="flex-1 grid place-items-center text-muted-foreground">
                    <div className="text-center">
                      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold animate-pulse">z</div>
                      <p>加载 {current.label} 中…</p>
                    </div>
                  </div>
                ) : current.kind === 'plugin' && ActivePluginViewer ? (
                  <div className="h-full"><ActivePluginViewer /></div>
                ) : current.kind === 'plugin' ? (
                  <div className="flex-1 grid place-items-center text-muted-foreground">
                    <div className="text-center">
                      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">z</div>
                      <p>{current.icon} {current.label} · 暂无可视化</p>
                      <p className="mt-1 text-xs">该模式当前没有图形界面，请使用 API 或切换到其他模式</p>
                    </div>
                  </div>
                ) : current.kind === 'file' && Viewer ? (
                  <div className="mx-auto max-w-5xl h-full bg-background border rounded-lg shadow-sm overflow-auto">
                    <Viewer path={current.path} />
                  </div>
                ) : (
                  <div className="flex-1 grid place-items-center text-muted-foreground">
                    <div className="text-center">
                      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">z</div>
                      <p>从左侧选择模式或文档</p>
                      <p className="mt-1 text-xs">plugins: {plugins.map(p => `${p.icon}${p.label}`).join(' ') || 'loading...'}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              <div className="text-center">
                <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">z</div>
                <p>从左侧选择模式或文档</p>
                <p className="mt-1 text-xs">plugins: {plugins.map(p => `${p.icon}${p.label}`).join(' ') || 'loading...'}</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
