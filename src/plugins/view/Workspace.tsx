import { useEffect, useRef, useState } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../web/viewers/UnsupportedViewer.js';
import { viewState } from './state.js';
import OutlineNav from './OutlineNav.js';
import { EmptyState } from '../../web/components/EmptyState.js';
import { Eye } from 'lucide-react';

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

  // 大纲阈值:在内容真实渲染后测量——MdViewer 异步 fetch,current 变化时 textContent 还是加载占位符
  // 用 MutationObserver 监听容器内容变化,渲染完成后才测量,避免永远量到 4 字符占位
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const checkLen = () => {
      const textLen = el.textContent?.length ?? 0;
      setShowOutline(textLen > LONG_DOC_THRESHOLD);
    };
    checkLen();
    const obs = new MutationObserver(checkLen);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
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
        <EmptyState icon={<Eye className="h-6 w-6" />} title="从左侧选择文件预览" hint="支持 Markdown、图片、代码等格式" tone="primary" />
      )}
    </div>
  );
}
