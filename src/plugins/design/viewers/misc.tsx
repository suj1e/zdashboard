/** design 资产查看器:媒体/字体/未支持(自 foundation Workspace 拆出的杂项) */
import { useEffect, useState } from 'react';
import { MdViewer } from '../../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../../web/viewers/CodeViewer.js';
import { useIcons } from '../../../web/lib/icons.js';

export function VideoViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8"><video src={'/' + encodeURI(path)} controls className="max-w-full max-h-[80vh] rounded border" /></div>;
}

export function AudioViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8"><audio src={'/' + encodeURI(path)} controls className="w-full max-w-2xl" /></div>;
}

export function PdfViewer({ path }: { path: string }) {
  return <div className="grid place-items-center p-8 h-full"><iframe src={'/' + encodeURI(path)} title="PDF" className="w-full h-full max-h-[80vh] rounded border bg-white" /></div>;
}

export function FontViewer({ path }: { path: string }) {
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

export function UnsupportedViewer({ path }: { path: string }) {
  const { icon } = useIcons();
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div>{icon('image-off', 'h-10 w-10 mx-auto mb-3 opacity-50')}<p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
  </div>;
}

export { MdViewer, ImageViewer, CodeViewer };
