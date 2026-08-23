import React, { useState, useEffect } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { FilterPills } from '../../web/components/FilterPills.js';
import { designState } from './state.js';
import { EmptyState } from '../../web/components/EmptyState.js';
import { useIcons } from '../../web/lib/icons.js';

type VpMode = 0 | 768 | 375 | 'custom';

function PageViewer({ path }: { path: string }) {
  return <iframe src={'/' + encodeURI(path)} title="预览" className="w-full h-full border-0 bg-white" />;
}

interface TokenSection {
  label: string;
  items: { name: string; value: string }[];
}

function TokenViewer({ path }: { path: string }) {
  const [sections, setSections] = useState<TokenSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSections([]);
    fetch('/' + encodeURI(path), { cache: 'no-store' })
      .then(r => r.text())
      .then(text => {
        if (cancelled) return;
        const vars = text.match(/--[A-Za-z0-9_-]+\s*:\s*[^;}\n]+/g) ?? [];
        if (!vars.length) { setSections([]); setLoading(false); return; }
        const isColor = (v: string) => /^(#([0-9a-fA-F]{3,8})\b|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i.test(v.trim());
        const colors = vars.filter(v => isColor(v));
        const fonts  = vars.filter(v => /font|family|type/.test(v.toLowerCase()) && !isColor(v));
        const rest   = vars.filter(v => !colors.includes(v) && !fonts.includes(v));
        const parseVal = (raw: string) => {
          const idx = raw.indexOf(':');
          const name = raw.slice(0, idx).trim();
          const value = raw.slice(idx + 1).trim();
          return { name, value };
        };
        const result: TokenSection[] = [];
        if (colors.length) result.push({ label: `配色 · ${colors.length}`, items: colors.map(parseVal) });
        if (fonts.length)  result.push({ label: `字体 · ${fonts.length}`,  items: fonts.map(parseVal) });
        if (rest.length)   result.push({ label: `其他 · ${rest.length}`,   items: rest.map(parseVal) });
        setSections(result);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setSections([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [path]);

  if (loading) return <p className="p-3 text-xs text-muted-foreground">解析中…</p>;
  if (!sections.length) return <p className="p-3 text-xs">未发现 CSS 变量</p>;

  return (
    <div className="p-8 flex flex-col gap-7">
      {sections.map(sec => {
        const hasColorItems = sec.items.some(it => /^(#|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i.test(it.value));
        const hasFontItems  = sec.items.some(it => /font|family|type/i.test(it.name));
        return (
          <section key={sec.label}>
            <div className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{sec.label}</div>
            {hasColorItems ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--token-card-min-w), 1fr))' }}>
                {sec.items.filter(it => /^(#|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i.test(it.value)).map(({ name, value }) => (
                  <div key={name} className="overflow-hidden rounded-lg border bg-background">
                    <div className="h-[var(--design-preview-h)] border-b" style={{ background: value }} />
                    <div className="px-2.5 pt-2 font-mono text-sm break-all">{name}</div>
                    <div className="px-2.5 pb-2 text-xs text-muted-foreground">{value}</div>
                  </div>
                ))}
              </div>
            ) : hasFontItems ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--token-card-min-w), 1fr))' }}>
                {sec.items.map(({ name, value }) => (
                  <div key={name} className="overflow-hidden rounded-lg border bg-background">
                    <div className="grid h-[var(--design-preview-h)] place-items-center text-2xl" style={{ fontFamily: value }}>Aa</div>
                    <div className="px-2.5 font-mono text-sm">{name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {sec.items.map(({ name, value }) => (
                  <div key={name} className="flex justify-between gap-3 px-2.5 py-1.5 rounded border bg-background text-xs">
                    <span className="font-mono">{name}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
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

function FontViewer({ path }: { path: string }) {
  const [name, setName] = useState('');
  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    let face: FontFace | null = null;
    fetch('/' + encodeURI(path))
      .then(r => r.blob())
      .then(async blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        face = new FontFace('zd-font-preview', `url(${objectUrl})`);
        await face.load();
        if (cancelled) { (face as FontFace & { dispose?: () => void }).dispose?.(); return; }
        document.fonts.add(face);
        setName(path.split('/').pop() ?? path);
      })
      .catch(() => { if (!cancelled) setName(path.split('/').pop() ?? path); });
    return () => {
      cancelled = true;
      if (face) { try { document.fonts.delete(face); (face as FontFace & { dispose?: () => void }).dispose?.(); } catch { /* ignore */ } }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return (
    <div className="h-full overflow-auto p-8 grid gap-6 place-content-center text-center">
      <div className="text-xs text-muted-foreground font-mono break-all">{path}</div>
      <div className="text-5xl" style={{ fontFamily: name ? "'zd-font-preview', serif" : 'serif' }}>Aa 字体预览 0123</div>
    </div>
  );
}

function UnsupportedViewer({ path }: { path: string }) {
  const { icon } = useIcons();
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div>{icon('image-off', 'h-10 w-10 mx-auto mb-3 opacity-50')}<p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
  </div>;
}

const VIEWERS: Partial<Record<string, React.ComponentType<{ path: string }>>> = {
  page: PageViewer, icon: ImageViewer, token: TokenViewer, md: MdViewer,
  video: VideoViewer, audio: AudioViewer, pdf: PdfViewer,
  component: CodeViewer, font: FontViewer,
};

function selectViewer(type: string): React.ComponentType<{ path: string }> {
  return VIEWERS[type] ?? UnsupportedViewer;
}

function Viewport({ mode, onMode, w, h, onW, onH }: {
  mode: VpMode; onMode: (m: VpMode) => void; w: number; h: number; onW: (n: number) => void; onH: (n: number) => void;
}) {
  const { icon } = useIcons();
  const btns: { v: VpMode; icon: React.ReactNode; label: string }[] = [
    { v: 0, icon: icon('monitor', 'h-3.5 w-3.5'), label: '桌面' },
    { v: 768, icon: icon('tablet', 'h-3.5 w-3.5'), label: '768' },
    { v: 375, icon: icon('smartphone', 'h-3.5 w-3.5'), label: '375' },
    { v: 'custom', icon: icon('sliders-horizontal', 'h-3.5 w-3.5'), label: '自定义' },
  ];
  const inputCls = 'w-[var(--design-input-w)] h-7 px-1 text-center text-xs rounded border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:border-primary';
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
        <input type="number" value={w} min={280} max={3000} step={8} onChange={e => onW(Number(e.target.value))} aria-label="自定义宽度" className={inputCls} />
        <span className="text-muted-foreground/70">×</span>
        <input type="number" value={h} min={400} max={3000} step={8} onChange={e => onH(Number(e.target.value))} aria-label="自定义高度" className={inputCls} />
        <span className="text-sm text-muted-foreground/70">px</span>
      </span>
    </div>
  );
}

export default function Workspace() {
  const { icon } = useIcons();
  const [current, setCurrent] = useState(() => designState.get());
  const [mode, setMode] = useState<VpMode>(0);
  const [w, setW] = useState(1024);
  const [h, setH] = useState(768);

  useEffect(() => designState.subscribe(setCurrent), []);

  const Viewer = current ? selectViewer(current.type) : null;
  const vpLabel = mode === 0 ? '桌面' : mode === 'custom' ? `${w} × ${h}` : `${mode}px`;

  return (
    <div className="mx-auto h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      {current && Viewer ? (
        <>
          <div className="h-[var(--design-toolbar-h)] flex-none flex items-center justify-between px-3.5 border-b bg-background text-xs">
            <span className="font-mono truncate">{current.path}</span>
            <span className="text-muted-foreground ml-3 flex-none">{vpLabel}</span>
            <Viewport mode={mode} onMode={setMode} w={w} h={h} onW={setW} onH={setH} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {current.type === 'page' ? (
              <div className="mx-auto bg-background overflow-hidden"
                style={{ maxWidth: mode === 0 ? undefined : mode === 'custom' ? w : (mode as number), height: mode === 'custom' ? h : '100%' }}>
                <Viewer path={current.path} />
              </div>
            ) : (
              <div className="mx-auto max-w-5xl h-full overflow-auto">
                <Viewer path={current.path} />
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState icon={icon('palette', 'h-6 w-6')} title="从左侧选择一个资产预览" hint="点左侧折叠钮展开资产树 · 改文件即时刷新" tone="primary" />
      )}
    </div>
  );
}
