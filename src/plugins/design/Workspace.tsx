import React, { useState, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, SlidersHorizontal, ImageOff } from 'lucide-react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { FilterPills } from '../../web/components/FilterPills.js';
import { designState } from './state.js';

type VpMode = 0 | 768 | 375 | 'custom';

function PageViewer({ path }: { path: string }) {
  return <iframe src={'/' + encodeURI(path)} title="预览" className="w-full h-full border-0 bg-white" />;
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
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let face: FontFace | null = null;
    const url = '/' + encodeURI(path);
    fetch(url, { cache: 'no-store' }).then(r => r.blob()).then(blob => {
      face = new FontFace('preview-font', URL.createObjectURL(blob));
      return face.load();
    }).then(() => {
      if (face) {
        document.fonts.add(face);
        setLoaded(true);
      }
    }).catch(() => setLoaded(true));
    return () => {
      if (face) {
        document.fonts.delete(face);
        face.source?.forEach?.((b: any) => { if (b instanceof Blob) URL.revokeObjectURL(b as any); });
      }
    };
  }, [path]);
  return (
    <div className="p-8 h-full flex flex-col gap-4">
      <div className="text-xs text-muted-foreground">字体文件: {path}</div>
      <div className="flex-1 grid place-items-center">
        <div className="text-6xl" style={{ fontFamily: loaded ? "'preview-font', serif" : 'serif' }}>Aa 字体</div>
      </div>
    </div>
  );
}

function UnsupportedViewer({ path }: { path: string }) {
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div><ImageOff className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
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
        <FilterPills
          items={btns.map(b => ({ key: String(b.v), label: b.label, renderLabel: () => <>{b.icon}<span className="hidden sm:inline">{b.label}</span></> }))}
          value={String(mode)}
          onChange={(v) => onMode(v === '0' ? 0 : v === 'custom' ? 'custom' : Number(v))}
          ariaLabel="视口模式"
        />
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

export default function Workspace() {
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
          <div className="h-[38px] flex-none flex items-center justify-between px-3.5 border-b bg-background text-xs">
            <span className="font-mono truncate">{current.path}</span>
            <span className="text-muted-foreground ml-3 flex-none">{vpLabel}</span>
            <Viewport mode={mode} onMode={setMode} w={w} h={h} onW={setW} onH={setH} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {current.type === 'page' ? (
              <div className="mx-auto bg-background overflow-hidden"
                style={{ maxWidth: mode === 0 ? undefined : mode === 'custom' ? w : mode, height: mode === 'custom' ? h : '100%' }}>
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
        <div className="flex-1 grid place-items-center text-muted-foreground">
          <div className="text-center">
            <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">z</div>
            <p>从左侧选择一个资产预览</p>
            <p className="mt-1 text-xs">点左侧折叠钮展开资产树 · 改文件即时刷新</p>
          </div>
        </div>
      )}
    </div>
  );
}
