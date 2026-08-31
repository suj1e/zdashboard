/** design 资产查看器:媒体/字体/未支持(自 foundation Workspace 拆出的杂项) */
import { useEffect, useRef, useState } from 'react';
import { useIcons } from '../../../web/lib/icons.js';
import { MdViewer as SharedMdViewer } from '../../../web/viewers/MdViewer.js';
import { ImageViewer as SharedImageViewer } from '../../../web/viewers/ImageViewer.js';
import { CodeViewer as SharedCodeViewer } from '../../../web/viewers/CodeViewer.js';
import { useViewerFreshness, RefreshButton } from '../../../web/viewers/freshness.js';

/** design 资产一律走 /__design/asset 代理(约定根 .zdev/design);共享查看器默认解析保留给 view 插件 */
const viaDesignAsset = (p: string) => '/__design/asset?path=' + encodeURIComponent(p);

/** files SSE(300ms 防抖)/手动刷新命中当前资产 → src 追加时间戳参数强制重载(不做 key 重挂) */
function useAssetReload() {
  const [v, refresh] = useViewerFreshness();
  return { bust: (url: string) => (v ? `${url}&v=${v}` : url), refresh };
}

/** 右上角手动刷新钮(悬浮于资产内容之上) */
function FloatingRefresh({ onClick }: { onClick: () => void }) {
  return <div className="absolute right-3 top-3 z-10"><RefreshButton onClick={onClick} /></div>;
}

export function MdViewer({ path }: { path: string }) {
  return <SharedMdViewer path={path} resolve={viaDesignAsset} />;
}

export function ImageViewer({ path }: { path: string }) {
  return <SharedImageViewer path={path} resolve={viaDesignAsset} />;
}

export function CodeViewer({ path }: { path: string }) {
  return <SharedCodeViewer path={path} resolve={viaDesignAsset} />;
}

export function VideoViewer({ path }: { path: string }) {
  const { bust, refresh } = useAssetReload();
  return (
    <div className="relative grid place-items-center p-8">
      <FloatingRefresh onClick={refresh} />
      <video src={bust(viaDesignAsset(path))} controls className="max-w-full max-h-[80vh] rounded border" />
    </div>
  );
}

export function AudioViewer({ path }: { path: string }) {
  const { bust, refresh } = useAssetReload();
  return (
    <div className="relative grid place-items-center p-8">
      <FloatingRefresh onClick={refresh} />
      <audio src={bust(viaDesignAsset(path))} controls className="w-full max-w-2xl" />
    </div>
  );
}

export function PdfViewer({ path }: { path: string }) {
  const { bust, refresh } = useAssetReload();
  return (
    <div className="relative grid place-items-center p-8 h-full">
      <FloatingRefresh onClick={refresh} />
      <iframe src={bust(viaDesignAsset(path))} title="PDF" className="w-full h-full max-h-[80vh] rounded border bg-white" />
    </div>
  );
}

export function FontViewer({ path }: { path: string }) {
  // files SSE(300ms 防抖)/手动刷新重取当前字体资产;保留已加载字形,重取期间不闪空
  const [version, refresh] = useViewerFreshness();
  const loadedPathRef = useRef<string | null>(null);
  const [name, setName] = useState('');
  useEffect(() => {
    let cancelled = false;
    const pathChanged = loadedPathRef.current !== path;
    loadedPathRef.current = path;
    let objectUrl = '';
    let face: FontFace | null = null;
    if (pathChanged) setName('');
    fetch(viaDesignAsset(path))
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
  }, [path, version]);
  return (
    <div className="relative h-full overflow-auto p-8 grid gap-6 place-content-center text-center">
      <FloatingRefresh onClick={refresh} />
      <div className="text-xs text-muted-foreground font-mono break-all">{path}</div>
      <div className="text-5xl" style={{ fontFamily: name ? "'zd-font-preview', serif" : 'serif' }}>Aa 字体预览 0123</div>
    </div>
  );
}

export function UnsupportedViewer({ path }: { path: string }) {
  const { icon } = useIcons();
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div>{icon('image-off', 'h-10 w-10 mx-auto mb-3 opacity-50')}<p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
  </div>;
}
