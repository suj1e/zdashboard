import { useCallback, useEffect, useRef, useState } from 'react';
import { createHostBridge } from '../../sdk/bridge';
import type { HostSnapshot } from '../../sdk/bridge';
import { useRoute } from '../router';
import { useSSE } from '../hooks/useSSE';

export interface ExternalWorkspaceProps {
  viewerUrl: string;
  label: string;
  /** 插件 mode:导航出口与配置同步需要;缺省时 zd:navigate 不落导航 */
  mode?: string;
  /** 当前页 URL 参数(zd:init 携带;变化时推 zd:navigate) */
  params?: URLSearchParams;
}

/** 插件配置来源(GET /__plugins/config 按 mode 取本插件段) */
const PLUGINS_CONFIG_ENDPOINT = '/__plugins/config';

function currentThemeSnapshot(): { theme: string; mode: string } {
  const el = document.documentElement;
  return { theme: el.dataset.theme ?? 'default', mode: el.dataset.mode ?? 'dark' };
}

function searchToRecord(sp?: URLSearchParams): Record<string, string> {
  return sp ? Object.fromEntries(sp.entries()) : {};
}

/**
 * 外部插件工作区:sandbox 仅 allow-scripts(无 same-origin/form/popups),
 * 与 iframe 内插件的全部通信经 sdk/bridge 的 zd: 协议(postMessage)。
 */
export function ExternalWorkspace({ viewerUrl, label, mode, params }: ExternalWorkspaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const route = useRoute();
  const bridgeRef = useRef<ReturnType<typeof createHostBridge> | null>(null);
  const [pluginConfig, setPluginConfig] = useState<Record<string, unknown>>({});

  // 引用Latest化:桥实例不因路由/配置对象每次渲染重建而重建
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  const configRef = useRef(pluginConfig);
  useEffect(() => { configRef.current = pluginConfig; }, [pluginConfig]);
  const navigateRef = useRef(route.navigate);
  useEffect(() => { navigateRef.current = route.navigate; }, [route.navigate]);

  /** 拉取本插件配置;变化时同步推给 iframe(zd:config) */
  const refreshConfig = useCallback(() => {
    if (!mode) return;
    fetch(PLUGINS_CONFIG_ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json())
      .then((all: Record<string, Record<string, unknown>>) => {
        const cfg = all?.[mode] ?? {};
        setPluginConfig(cfg);
        bridgeRef.current?.sendConfig(mode, cfg);
      })
      .catch(() => { /* 配置拉取失败保持现状 */ });
  }, [mode]);

  useEffect(() => { refreshConfig(); }, [refreshConfig]);
  // SSE config 事件(配置保存广播)触发重拉
  useSSE(() => {}, () => {}, undefined, (plugin) => { if (!mode || plugin === mode) refreshConfig(); });

  // 桥生命周期 + 主题观察:documentElement 的 data-theme/data-mode 变化统一推 zd:theme
  useEffect(() => {
    const bridge = createHostBridge({
      target: iframeRef.current?.contentWindow ?? null,
      getSnapshot: (): HostSnapshot => ({
        ...currentThemeSnapshot(),
        params: searchToRecord(paramsRef.current),
        config: configRef.current,
      }),
      onNavigate: (p) => { if (mode) navigateRef.current({ p: mode, ...p }); },
    });
    bridgeRef.current = bridge;
    bridge.attach();

    const mo = new MutationObserver(() => {
      const { theme, mode } = currentThemeSnapshot();
      bridge.sendTheme(theme, mode);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

    return () => {
      mo.disconnect();
      bridge.destroy();
      bridgeRef.current = null;
    };
  }, [mode]);

  // 路由参数变化推 zd:navigate(宿主→iframe);首次挂载不推(zd:init 已携带)
  const paramsKey = params?.toString() ?? '';
  const prevParamsKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevParamsKey.current === null) { prevParamsKey.current = paramsKey; return; }
    if (prevParamsKey.current === paramsKey) return;
    prevParamsKey.current = paramsKey;
    bridgeRef.current?.sendNavigate(searchToRecord(params));
  }, [paramsKey, params]);

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-hidden rounded-lg border bg-background shadow-sm">
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        title={label}
        className="w-full h-full border-0 bg-background"
        sandbox="allow-scripts"
      />
    </div>
  );
}
