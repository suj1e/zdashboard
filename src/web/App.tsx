import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Topbar } from './components/Topbar';
import { IconRail } from './layout/IconRail';
import { SidebarFrame } from './layout/SidebarFrame';
import { StatusBar } from './layout/StatusBar';
import { HomeGrid, type Detects } from './home/HomeGrid';
import { usePlugins } from './lib/plugins';
import { useRoute } from './router';
import { useSSE } from './hooks/useSSE';
import { useModeIcon } from './lib/icons';
import { PluginPage, Skeleton } from './kit';

/** 一次性拉取 JSON;失败返回 null,由调用方保持默认状态 */
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return await r.json();
  } catch {
    return null;
  }
}

export default function App() {
  const plugins = usePlugins();
  const route = useRoute();
  const requestedMode = route.plugin;
  const [projectPath, setProjectPath] = useState('');
  const stoppedRef = useRef(false);
  const [detect, setDetect] = useState<Detects>({ hasOpenspec: false, hasDocs: false, hasJust: false });

  const status = useSSE(
    () => { window.location.reload(); },
    () => {},
    stoppedRef
  );

  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ root?: string }>('/__config').then((cfg) => {
      if (!cancelled && cfg) setProjectPath(cfg.root ?? '');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<Detects>('/__detect').then((data) => {
      if (!cancelled && data) setDetect({ hasOpenspec: !!data.hasOpenspec, hasDocs: !!data.hasDocs, hasJust: !!data.hasJust });
    });
    return () => { cancelled = true; };
  }, []);

  // 非法 ?p=xxx(注册表中不存在)回落首页;插件列表加载完成前先尊重 URL 值避免闪烁
  const known =
    requestedMode && plugins.length > 0 && !plugins.some((p) => p.mode === requestedMode)
      ? null
      : requestedMode;
  const plugin = known ? plugins.find((p) => p.mode === known)! : null;

  // ?p=apply-batch 旧直达兼容:replace 一次性重定向到批量 Tab(不留历史,不渲染首页);
  // 其余未知 mode 维持回落首页逻辑
  useLayoutEffect(() => {
    if (requestedMode === 'apply-batch') {
      route.navigate({ p: 'apply', view: 'batch' }, { replace: true });
    }
  }, [requestedMode, route]);

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
              plugin.manifest ? (
                // SDK 插件:Workspace 自持 PluginPage(manifest 单源),宿主只做分包边界
                <Suspense fallback={<Skeleton rows={6} className="mx-auto max-w-6xl" />}>
                  <div key={known} className="h-full animate-in fade-in duration-200">
                    <plugin.Workspace params={route.params} />
                  </div>
                </Suspense>
              ) : (
                // 兼容壳:legacy/外部插件(无 manifest)仍由宿主套 PluginPage
                <PluginPageShell mode={known} label={plugin.label} description={plugin.description} icon={plugin.icon}>
                  <Suspense fallback={<Skeleton rows={6} className="mx-auto max-w-6xl" />}>
                    <plugin.Workspace params={route.params} />
                  </Suspense>
                </PluginPageShell>
              )
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

/**
 * 插件页骨架:统一 PluginPage 模板(mode→icon 主题图标,manifest.icon 兜底)。
 * 外部插件兼容壳:内置插件走 SDK web 入口后,该壳仅服务外部插件;key=mode 保证切换时重挂载。
 */
function PluginPageShell({ mode, label, description, icon: fallbackIcon, children }: {
  mode: string;
  label: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
}) {
  const themed = useModeIcon(mode, 'h-5 w-5');
  return (
    <PluginPage
      manifest={{ mode, label, description }}
      icon={themed ?? (fallbackIcon ? <span className="text-base leading-none">{fallbackIcon}</span> : undefined)}
      breadcrumb={['插件', mode]}
    >
      <div key={mode} className="h-full animate-in fade-in duration-200">
        {children}
      </div>
    </PluginPage>
  );
}
