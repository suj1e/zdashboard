/**
 * design 工作区:资产预览(type/asset 入 URL),查看器注册表按九类资产分发。
 * 视口工具条保留;空态 kit EmptyState。
 */
import { useState } from 'react';
import { FilterPills } from '../../web/components/FilterPills.js';
import { EmptyState, PluginPage } from '../../web/kit/index.js';
import { useIcons, useModeIcon } from '../../web/lib/icons.js';
import { useRoute } from '../../web/router.js';
import { readJsonSafe, safeSetItem } from '../../web/lib/safeStorage.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { selectViewer } from './viewers/index.js';
import { manifest } from './manifest.js';

type VpMode = 0 | 768 | 375 | 'custom';

/** 视口状态持久化键(JSON `{ mode, w, h }`,zd- 前缀规范) */
const DESIGN_VIEWPORT_KEY = 'zd-design-viewport';

/** 与既有默认值同源(mode=桌面,1024×768) */
const DEFAULT_VIEWPORT = { mode: 0 as VpMode, w: 1024, h: 768 };
const PRESET_MODES = [0, 768, 375];

/** 自定义宽高边界(review S2:单源,持久化校验与 input min/max 共享) */
const MIN_W = 280;
const MAX_W = 3000;
const MIN_H = 400;
const MAX_H = 3000;

interface VpState { mode: VpMode; w: number; h: number }

/** 形状校验:mode 预设/custom 且宽高在界内才认;不过 → readJsonSafe 回落默认(回落哲学一致) */
function isVpState(v: unknown): v is VpState {
  if (!v || typeof v !== 'object') return false;
  const o = v as { mode?: unknown; w?: unknown; h?: unknown };
  const modeOk = PRESET_MODES.includes(o.mode as number) || o.mode === 'custom';
  const wOk = typeof o.w === 'number' && Number.isFinite(o.w) && o.w >= MIN_W && o.w <= MAX_W;
  const hOk = typeof o.h === 'number' && Number.isFinite(o.h) && o.h >= MIN_H && o.h <= MAX_H;
  return modeOk && wOk && hOk;
}

const readViewport = (): VpState => readJsonSafe<VpState>(DESIGN_VIEWPORT_KEY, { ...DEFAULT_VIEWPORT }, isVpState);

function writeViewport(v: VpState) {
  safeSetItem(DESIGN_VIEWPORT_KEY, JSON.stringify(v));
}

function Viewport({ mode, onMode, w, h, onW, onH }: {
  mode: VpMode; onMode: (m: VpMode) => void; w: number; h: number; onW: (n: number) => void; onH: (n: number) => void;
}) {
  const { icon } = useIcons();
  const btns: { v: VpMode; icon: ReturnType<typeof icon>; label: string }[] = [
    { v: 0, icon: icon('monitor', 'h-3.5 w-3.5'), label: '桌面' },
    { v: 768, icon: icon('tablet', 'h-3.5 w-3.5'), label: '768' },
    { v: 375, icon: icon('smartphone', 'h-3.5 w-3.5'), label: '375' },
    { v: 'custom', icon: icon('sliders-horizontal', 'h-3.5 w-3.5'), label: '自定义' },
  ];
  const inputCls = 'w-[var(--design-input-w)] h-7 px-1 text-center text-xs rounded border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:border-primary';
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted">
        <FilterPills
          items={btns.map(b => ({ key: String(b.v), label: b.label, renderLabel: () => <>{b.icon}<span className="hidden sm:inline">{b.label}</span></> }))}
          value={String(mode)}
          onChange={(v) => onMode(v === '0' ? 0 : v === 'custom' ? 'custom' : (Number(v) as 768 | 375))}
          ariaLabel="视口模式"
        />
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="number" value={w} min={MIN_W} max={MAX_W} step={8} onChange={e => onW(Number(e.target.value))} aria-label="自定义宽度" className={inputCls} />
        <span className="text-muted-foreground/70">×</span>
        <input type="number" value={h} min={MIN_H} max={MAX_H} step={8} onChange={e => onH(Number(e.target.value))} aria-label="自定义高度" className={inputCls} />
        <span className="text-sm text-muted-foreground/70">px</span>
      </span>
    </div>
  );
}

export default function Workspace({ params }: PluginWorkspaceProps) {
  const { icon } = useIcons();
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  const type = params.get('type') ?? '';
  const asset = params.get('asset');
  // 视口状态单源持久化(zd-design-viewport):模式与自定义宽高一起读写
  const [vp, setVp] = useState(readViewport);
  // 纯事件回调:先算 next,setState 与持久化并列(review S1:updater 内不写副作用,StrictMode 双调用不重复落盘)
  const setMode = (m: VpMode) => {
    const next = { ...vp, mode: m };
    setVp(next);
    writeViewport(next);
  };
  const setW = (n: number) => {
    const next = { ...vp, w: n };
    setVp(next);
    writeViewport(next);
  };
  const setH = (n: number) => {
    const next = { ...vp, h: n };
    setVp(next);
    writeViewport(next);
  };
  const { mode, w, h } = vp;

  const Viewer = asset ? selectViewer(type) : null;
  const vpLabel = mode === 0 ? '桌面' : mode === 'custom' ? `${w} × ${h}` : `${mode}px`;

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={['插件', manifest.mode, ...(type ? [type] : []), ...(asset ? [asset] : [])]}
    >
      <div className="mx-auto h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
        {asset && Viewer ? (
          <>
            <div className="h-[var(--design-toolbar-h)] flex-none flex items-center justify-between px-3.5 border-b bg-background text-xs">
              <span className="font-mono truncate">{asset}</span>
              <span className="text-muted-foreground ml-3 flex-none">{vpLabel}</span>
              <Viewport mode={mode} onMode={setMode} w={w} h={h} onW={setW} onH={setH} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {type === 'page' ? (
                <div className="mx-auto bg-background overflow-hidden"
                  style={{ maxWidth: mode === 0 ? undefined : mode === 'custom' ? w : (mode as number), height: mode === 'custom' ? h : '100%' }}>
                  <Viewer path={asset} />
                </div>
              ) : (
                <div className="mx-auto max-w-5xl h-full overflow-auto">
                  <Viewer path={asset} />
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState icon={icon('palette', 'h-6 w-6')} title="从左侧选择一个资产预览" hint="点左侧折叠钮展开资产树 · 改文件即时刷新" />
        )}
      </div>
    </PluginPage>
  );
}
