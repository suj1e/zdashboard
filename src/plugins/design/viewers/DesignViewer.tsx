import { useRef, useState, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, SlidersHorizontal, ImageOff } from 'lucide-react';
import { useSSE } from '../../../web/hooks/useSSE';

type AssetType = 'page' | 'component' | 'icon' | 'token' | 'md' | 'video' | 'audio' | 'pdf' | 'code' | 'font' | 'other';
type VpMode = 0 | 768 | 375 | 'custom';

interface AssetFile { path: string; name: string; ext: string; type: AssetType; }
type ScanResult = Record<AssetType, AssetFile[]>;

const GROUPS: { key: AssetType; label: string }[] = [
  { key: 'page', label: '页面' }, { key: 'component', label: '组件' },
  { key: 'icon', label: '图标' }, { key: 'token', label: 'Tokens' },
  { key: 'md', label: '文档' }, { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' }, { key: 'pdf', label: 'PDF' },
  { key: 'code', label: '代码' }, { key: 'font', label: '字体' },
  { key: 'other', label: '其他' },
];

const PAGE_EXTS = ['.html', '.htm'];
const ICON_EXTS = ['.svg', '.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.ogg', '.ogv'];
const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aac', '.m4a'];
const CODE_EXTS = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.css', '.json', '.txt', '.xml', '.yml', '.yaml', '.sh', '.md'];
const FONT_EXTS = ['.woff', '.woff2', '.ttf', '.otf'];
const TOKEN_RE = /token|theme|design|color|palette|typograph/i;

function categorize(rel: string, ext: string): AssetType {
  if (rel.indexOf('components/') === 0) return 'component';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.md') return 'md';
  if (FONT_EXTS.includes(ext)) return 'font';
  if (ICON_EXTS.includes(ext)) return 'icon';
  if (PAGE_EXTS.includes(ext)) return 'page';
  if (CODE_EXTS.includes(ext)) return TOKEN_RE.test(rel) && (ext === '.css' || ext === '.json') ? 'token' : 'code';
  return 'other';
}

function PageViewer({ path }: { path: string }) {
  return <iframe src={'/' + encodeURI(path)} title="预览" className="w-full h-full border-0 bg-white" />;
}

function ImageViewer({ path }: { path: string }) {
  const [dim, setDim] = useState('-');
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(false);
  const name = path.split('/').pop();
  const chess: React.CSSProperties = {
    backgroundImage: 'linear-gradient(45deg,hsl(var(--border)) 25%,transparent 25%),linear-gradient(-45deg,hsl(var(--border)) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,hsl(var(--border)) 75%),linear-gradient(-45deg,transparent 75%,hsl(var(--border)) 75%)',
    backgroundSize: '16px 16px', backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-4 py-2 border-b text-xs flex items-center gap-3">
        <span className="font-mono text-foreground">{name}</span>
        <span className="text-muted-foreground">{dim}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="w-6 h-6 rounded bg-muted hover:bg-muted/70" aria-label="缩小">−</button>
          <span className="w-10 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))} className="w-6 h-6 rounded bg-muted hover:bg-muted/70" aria-label="放大">+</button>
          <button onClick={() => setZoom(1)} className="ml-1 px-2 h-6 rounded bg-muted hover:bg-muted/70">复位</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto grid place-items-center p-6" style={chess}>
        {err ? <p className="text-muted-foreground">该格式无法预览</p> : (
          <img src={'/' + encodeURI(path)} alt={name} style={{ transform: `scale(${zoom})` }} className="max-w-full max-h-full object-contain transition-transform"
            onLoad={e => setDim(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} onError={() => setErr(true)} />
        )}
      </div>
    </div>
  );
}

function TokenViewer({ path }: { path: string }) {
  const [html, setHtml] = useState('<p class="p-3 text-xs text-muted-foreground">解析中…</p>');
  useEffect(() => {
    fetch('/' + encodeURI(path), { cache: 'no-store' }).then(r => r.text()).then(text => {
      const vars = text.match(/--[A-Za-z0-9_-]+\s*:\s*[^;}\n]+/g) ?? [];
      if (!vars.length) { setHtml('<p class="p-3 text-xs">未发现 CSS 变量</p>'); return; }
      const isColor = (v: string) => /^(#([0-9a-fA-F]{3,8})\b|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i.test(v.trim());
      const colors = vars.filter(v => isColor(v));
      const fonts = vars.filter(v => /font|family|type/.test(v.toLowerCase()) && !isColor(v));
      const rest = vars.filter(v => !colors.includes(v) && !fonts.includes(v));
      let h = '';
      if (colors.length) { h += `<div class="mb-7"><div class="mb-3 text-[11px] font-semibold uppercase text-muted-foreground">配色 · ${colors.length}</div><div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">`; for (const c of colors) h += `<div class="overflow-hidden rounded-lg border bg-background"><div class="h-[72px] border-b" style="background:${c}"></div><div class="px-2.5 pt-2 font-mono text-[11px] break-all">${c.split(':')[0].trim()}</div><div class="px-2.5 pb-2 text-xs text-muted-foreground">${c.split(':').slice(1).join(':').trim()}</div></div>`; h += '</div></div>'; }
      if (fonts.length) { h += `<div class="mb-7"><div class="mb-3 text-[11px] font-semibold uppercase text-muted-foreground">字体 · ${fonts.length}</div><div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">`; for (const f of fonts) h += `<div class="overflow-hidden rounded-lg border bg-background"><div class="grid h-[72px] place-items-center text-2xl" style="font-family:${f.split(':').slice(1).join(':').trim()}">Aa</div><div class="px-2.5 font-mono text-[11px]">${f.split(':')[0].trim()}</div></div>`; h += '</div></div>'; }
      if (rest.length) { h += `<div class="mb-7"><div class="mb-3 text-[11px] font-semibold uppercase text-muted-foreground">其他 · ${rest.length}</div><div class="flex flex-col gap-1">`; for (const r of rest) h += `<div class="flex justify-between gap-3 px-2.5 py-1.5 rounded border bg-background text-xs"><span class="font-mono">${r.split(':')[0].trim()}</span><span class="text-muted-foreground">${r.split(':').slice(1).join(':').trim()}</span></div>`; h += '</div></div>'; }
      setHtml(h || '<p class="p-3 text-xs">无</p>');
    });
  }, [path]);
  return <div className="p-8" dangerouslySetInnerHTML={{ __html: html }} />;
}

function VideoViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8"><video src={'/' + encodeURI(path)} controls className="max-w-full max-h-[80vh] rounded border" /></div>;
}

function AudioViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8"><audio src={'/' + encodeURI(path)} controls className="w-full max-w-2xl" /></div>;
}

function PdfViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8 h-full"><iframe src={'/' + encodeURI(path)} title="PDF" className="w-full h-full max-h-[80vh] rounded border bg-white" /></div>;
}

function CodeViewer({ path }: { path: string }) {
  const [text, setText] = useState('');
  useEffect(() => { fetch('/' + encodeURI(path), { cache: 'no-store' }).then(r => r.text()).then(setText); }, [path]);
  return <pre className="p-6 text-xs leading-relaxed overflow-auto h-full">{text || '加载中…'}</pre>;
}

function FontViewer({ path }: { path: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl('/' + encodeURI(path)); }, [path]);
  return (
    <div className="p-8 h-full flex flex-col gap-4">
      <div className="text-xs text-muted-foreground">字体文件: {path}</div>
      <div className="flex-1 grid place-items-center">
        {url && <link rel="preload" as="font" href={url} crossOrigin="anonymous" />}
        <div className="text-6xl" style={{ fontFamily: url ? `url(${url})` : 'serif' }}>Aa 字体</div>
      </div>
    </div>
  );
}

function UnsupportedViewer({ path }: { path: string }) {
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div><ImageOff className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
  </div>;
}

const VIEWERS: Partial<Record<AssetType, React.ComponentType<{ path: string }>>> = {
  page: PageViewer, icon: ImageViewer, token: TokenViewer, md: PageViewer,
  video: VideoViewer, audio: AudioViewer, pdf: PdfViewer,
  code: CodeViewer, component: CodeViewer, font: FontViewer,
};

function selectViewer(type: AssetType): React.ComponentType<{ path: string }> {
  return VIEWERS[type] ?? UnsupportedViewer;
}

function Viewport({ mode, onMode, w, h, onW, onH }: {
  mode: VpMode; onMode: (m: VpMode) => void; w: number; h: number; onW: (n: number) => void; onH: (n: number) => void;
}) {
  const btns: { v: VpMode; icon: React.ReactNode; label: string }[] = [
    { v: 0, icon: <Monitor className="h-3.5 w-3.5" />, label: '桌面' },
    { v: 768, icon: <Tablet className="h-3.5 w-3.5" />, label: '768' },
    { v: 375, icon: <Smartphone className="h-3.5 w-3.5" />, label: '375' },
    { v: 'custom', icon: <SlidersHorizontal className="h-3.5 w-3.5" />, label: '自定义' },
  ];
  const inputCls = 'w-[50px] h-7 px-1 text-center text-xs rounded border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:border-primary';
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted">
        {btns.map(b => (
          <button key={String(b.v)} onClick={() => onMode(b.v)} className={`h-7 gap-1.5 px-2.5 rounded text-xs inline-flex items-center ${mode === b.v ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted/70'}`}>
            {b.icon}<span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="number" value={w} min={280} max={3000} step={8} onChange={e => onW(Number(e.target.value))} aria-label="自定义宽度" className={inputCls} />
        <span className="text-muted-foreground/70">×</span>
        <input type="number" value={h} min={400} max={3000} step={8} onChange={e => onH(Number(e.target.value))} aria-label="自定义高度" className={inputCls} />
        <span className="text-[11px] text-muted-foreground/70">px</span>
      </span>
    </div>
  );
}

function FileTree({ open, current, onSelect, refreshKey }: { open: boolean; current: string | null; onSelect: (path: string, type: AssetType) => void; refreshKey: number }) {
  const [data, setData] = useState<ScanResult | null>(null);
  useEffect(() => { fetch('/__files', { cache: 'no-store' }).then(r => r.json()).then(setData); }, [refreshKey]);
  if (!data) return open ? <p className="p-3 text-xs text-muted-foreground">加载中…</p> : null;
  let total = 0; for (const k in data) total += data[k as AssetType].length;
  return (
    <aside className={`border-r bg-background overflow-auto fixed sm:static z-20 h-full sm:h-auto w-[78%] max-w-[252px] sm:max-w-none sm:w-[252px] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full sm:hidden'}`}>
      <div className="p-3 text-xs text-muted-foreground">{total} 个资产</div>
      {GROUPS.map(g => {
        const items = data[g.key] ?? []; if (!items.length) return null;
        return <div key={g.key} className="mb-1">
          <div className="px-3.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label} <span className="font-normal">{items.length}</span></div>
          {items.map(it => (
            <button key={it.path} onClick={() => onSelect(it.path, it.type)}
              className={`w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs border-l-2 border-transparent hover:bg-muted ${current === it.path ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}>
              <span className="break-all">{it.name}</span><span className="font-mono text-[10px] text-muted-foreground">{it.ext}</span>
            </button>
          ))}
        </div>;
      })}
    </aside>
  );
}

export default function DesignViewer() {
  const [current, setCurrent] = useState<{ path: string; type: AssetType } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<VpMode>(0);
  const [w, setW] = useState(1024);
  const [h, setH] = useState(768);
  const [treeOpen, setTreeOpen] = useState(true);
  const stopped = useRef(false);

  useSSE(() => {}, () => setRefreshKey(k => k + 1), stopped);

  const Viewer = current ? selectViewer(current.type) : null;
  const vpLabel = mode === 0 ? '桌面' : mode === 'custom' ? `${w} × ${h}` : `${mode}px`;
  const dotBg = { backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '20px 20px' };

  return (
    <div className="flex h-full">
      <FileTree open={treeOpen} current={current?.path ?? null} onSelect={(path, type) => setCurrent({ path, type })} refreshKey={refreshKey} />
      {treeOpen && <div className="absolute inset-0 z-10 bg-black/40 sm:hidden" onClick={() => setTreeOpen(false)} />}
      <section className="flex-1 min-h-0 flex flex-col">
        {current && Viewer ? (
          <>
            <div className="h-[38px] flex-none flex items-center justify-between px-3.5 border-b bg-background text-xs">
              <span className="font-mono truncate">{current.path}</span>
              <span className="text-muted-foreground ml-3 flex-none">{vpLabel}</span>
              <Viewport mode={mode} onMode={setMode} w={w} h={h} onW={setW} onH={setH} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-6 relative" style={dotBg}>
              {current.type === 'page' ? (
                <div className="mx-auto bg-background border rounded-lg shadow-sm overflow-hidden"
                  style={{ maxWidth: mode === 0 ? undefined : mode === 'custom' ? w : mode, height: mode === 'custom' ? h : '100%' }}>
                  <Viewer path={current.path} />
                </div>
              ) : (
                <div className="mx-auto max-w-5xl h-full bg-background border rounded-lg shadow-sm overflow-auto">
                  <Viewer path={current.path} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-muted-foreground">
            <div className="text-center">
              <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">z</div>
              <p>从左侧选择一个资产预览</p>
              <p className="mt-1 text-xs">点顶栏菜单按钮展开文件树 · 改文件即时刷新</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
