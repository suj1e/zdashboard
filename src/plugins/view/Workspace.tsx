import { useEffect, useRef, useState } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../web/viewers/UnsupportedViewer.js';
import { viewState } from './state.js';
import OutlineNav from './OutlineNav.js';

const LONG_DOC_THRESHOLD = 2500;

function viewerFor(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name === 'justfile' || name === 'makefile') return CodeViewer;
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return MdViewer;
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return ImageViewer;
  if (['.sql', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.py', '.js', '.ts', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.cs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish', '.env', '.gitignore', '.dockerfile'].includes(ext)) return CodeViewer;
  return UnsupportedViewer;
}

interface WorkspaceProps {
  navTarget?: { wt?: string; filter?: string };
}

export default function Workspace(_props: WorkspaceProps) {
  const [current, setCurrent] = useState<string | null>(() => viewState.get());
  const [showOutline, setShowOutline] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const Viewer = current ? viewerFor(current) : null;

  useEffect(() => viewState.subscribe(setCurrent), []);

  // After the viewer renders, check if the document is long enough to warrant an outline
  useEffect(() => {
    if (!contentRef.current) return;
    const textLen = contentRef.current.textContent?.length ?? 0;
    setShowOutline(textLen > LONG_DOC_THRESHOLD);
  }, [current]);

  return (
    <div className="mx-auto h-full max-w-5xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
      {current && Viewer ? (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div ref={contentRef} className="flex-1 min-h-0 overflow-auto">
            <Viewer path={current} />
          </div>
          {showOutline && <OutlineNav containerRef={contentRef} />}
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
    </div>
  );
}
