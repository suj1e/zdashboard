import { useEffect, useRef, useState } from 'react';
import { useSSE } from '../../../web/hooks/useSSE.js';
import { MdViewer } from '../../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../../web/viewers/UnsupportedViewer.js';
import { FileTree } from './FileTree.js';

function viewerFor(path: string) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return MdViewer;
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return ImageViewer;
  if (['.sql', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.py', '.js', '.ts', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.cs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish', '.env', '.gitignore', '.dockerfile'].includes(ext)) return CodeViewer;
  return UnsupportedViewer;
}

export default function Workspace() {
  const [current, setCurrent] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(true);
  const stopped = useRef(false);
  const status = useSSE(() => {}, () => setRefreshKey(k => k + 1), stopped);
  const Viewer = current ? viewerFor(current) : null;

  return (
    <div className="flex h-full">
      <FileTree open={open} currentPath={current} onSelectFile={(p) => setCurrent(p)} refreshKey={refreshKey} />
      {open && <div className="absolute inset-0 z-10 bg-black/40" onClick={() => setOpen(false)} />}
      <section className="flex-1 min-h-0 flex flex-col">
        {current && Viewer ? (
          <div className="flex-1 min-h-0 overflow-auto relative" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
            <div className="mx-auto max-w-5xl h-full bg-background border rounded-lg shadow-sm overflow-auto">
              <Viewer path={current} />
            </div>
          </div>
        ) : (
          <div className="flex-1 grid place-items-center text-muted-foreground">
            <div className="text-center">
              <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">👁️</div>
              <p>从左侧选择文件预览</p>
              <p className="mt-1 text-xs">支持 Markdown、图片、代码等格式</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
