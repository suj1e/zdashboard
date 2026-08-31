import { useCallback, useEffect, useRef, useState } from 'react';
import { createHostBridge, parseBridgeMessage } from '../../sdk/bridge';
import type { HostSnapshot } from '../../sdk/bridge';
import { useRoute } from '../router';
import { useSSE } from '../hooks/useSSE';
import { ErrorState, Skeleton } from '../kit/index.js';

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
/** 握手超时阈值:onLoad 后迟迟无 zd:ready(慢插件/死页面)的最长等待 */
const HANDSHAKE_TIMEOUT_MS = 8000;

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

  // ── 三态:loaded(onLoad)/ handshaked(zd:ready)/ timeout(8s 无 ready)──
  // 未握手渲染 Skeleton 覆盖层(iframe 不黑屏);超时渲染 ErrorState,重试重挂 iframe(key++)
  const [loaded, setLoaded] = useState(false);
  const [handshaked, setHandshaked] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [configError, setConfigError] = useState(false);

  // 引用Latest化:桥实例不因路由/配置对象每次渲染重建而重建
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);
  const configRef = useRef(pluginConfig);
  useEffect(() => { configRef.current = pluginConfig; }, [pluginConfig]);
  const navigateRef = useRef(route.navigate);
  useEffect(() => { navigateRef.current = route.navigate; }, [route.navigate]);

  /** 拉取本插件配置;变化时同步推给 iframe(zd:config);失败亮提示条(非静默) */
  const refreshConfig = useCallback(() => {
    if (!mode) return;
    fetch(PLUGINS_CONFIG_ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json())
      .then((all: Record<string, Record<string, unknown>>) => {
        setConfigError(false);
        const cfg = all?.[mode] ?? {};
        setPluginConfig(cfg);
        bridgeRef.current?.sendConfig(mode, cfg);
      })
      .catch(() => { setConfigError(true); /* 保持现有配置,提示条由 configError 渲染 */ });
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
    // iframeKey 入 deps:重试重挂(key++)产生新 contentWindow,桥必须随新窗口重建,
    // 否则 zd:init/主题/config/fetch 代理全部打到死 WindowProxy(B1)
  }, [mode, iframeKey]);

  // 路由参数变化推 zd:navigate(宿主→iframe);首次挂载不推(zd:init 已携带)
  const paramsKey = params?.toString() ?? '';
  const prevParamsKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevParamsKey.current === null) { prevParamsKey.current = paramsKey; return; }
    if (prevParamsKey.current === paramsKey) return;
    prevParamsKey.current = paramsKey;
    bridgeRef.current?.sendNavigate(searchToRecord(params));
  }, [paramsKey, params]);

  // zd:ready 握手观测(与桥独立、只读判定):e.source 与当前 iframe 严格配对,防伪造消息。
  // 迟到握手(超时后第 9 秒才 ready)同时撤除 ErrorState(S4),成功 iframe 不被常驻覆盖
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (parseBridgeMessage(e.data, 'toHost')?.type === 'zd:ready') {
        setHandshaked(true);
        setTimedOut(false);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // 握手超时:每次重挂(iframeKey++)重新计时;握手成功即撤表
  useEffect(() => {
    if (handshaked) return;
    setTimedOut(false);
    const t = setTimeout(() => setTimedOut(true), HANDSHAKE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [iframeKey, handshaked]);

  /** 重试:重挂 iframe(key++),三态复位重新计时 */
  const retry = useCallback(() => {
    setLoaded(false);
    setHandshaked(false);
    setTimedOut(false);
    setIframeKey((k) => k + 1);
  }, []);

  return (
    <div className="relative mx-auto h-full w-full max-w-6xl overflow-hidden rounded-lg border bg-background shadow-sm flex flex-col">
      {configError && (
        <div
          data-testid="config-error-bar"
          className="flex-none border-b border-warning/30 bg-warning/10 text-warning px-3 py-1.5 text-xs"
        >
          插件配置拉取失败,当前展示的是缓存配置
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={viewerUrl}
          title={label}
          className="w-full h-full border-0 bg-background"
          sandbox="allow-scripts"
          onLoad={() => setLoaded(true)}
        />
        {/* 未握手覆盖层:Skeleton 占位,提示文案区分「载入中/已载入待握手」 */}
        {!handshaked && !timedOut && (
          <div
            data-testid="handshake-overlay"
            className="absolute inset-0 grid place-items-center bg-background/80"
          >
            <div className="w-2/3 max-w-xs space-y-2.5">
              <Skeleton rows={3} />
              <p className="text-center text-xs text-muted-foreground">
                {loaded ? '插件已载入,等待握手…' : '正在加载插件…'}
              </p>
            </div>
          </div>
        )}
        {/* 握手超时:ErrorState 覆盖 iframe,onRetry 重挂重试 */}
        {timedOut && (
          <div className="absolute inset-0 grid bg-background">
            <ErrorState message={`插件加载超时(${HANDSHAKE_TIMEOUT_MS / 1000}s 内未完成握手)`} onRetry={retry} />
          </div>
        )}
      </div>
    </div>
  );
}
