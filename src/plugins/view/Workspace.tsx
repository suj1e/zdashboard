import { useEffect, useRef, useState } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../web/viewers/UnsupportedViewer.js';
import { viewState } from './state.js';
import OutlineNav from './OutlineNav.js';
import { EmptyState } from '../../web/components/EmptyState.js';
import { useIcons } from '../../web/lib/icons.js';

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
  const { icon } = useIcons();
  const [current, setCurrent] = useState<string | null>(() => viewState.get());
  const contentRef = useRef<HTMLDivElement>(null);
  const Viewer = current ? viewerFor(current) : null;

  useEffect(() => viewState.subscribe(setCurrent), []);

  return (
    <div className="mx-auto h-full max-w-5xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
      {current && Viewer ? (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div ref={contentRef} className="flex-1 min-h-0 overflow-auto">
            <Viewer path={current} />
          </div>
          <OutlineNav containerRef={contentRef} />
        </div>
      ) : (
        <EmptyState icon={icon('eye', 'h-6 w-6')} title="从左侧选择文件预览" hint="支持 Markdown、图片、代码等格式" tone="primary" />
      )}
    </div>
  );
}
