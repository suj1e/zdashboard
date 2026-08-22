import { useEffect, useState } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../web/viewers/UnsupportedViewer.js';
import { viewState } from './state.js';

function viewerFor(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  // 无扩展名的任务文件（justfile/Justfile/makefile 等）按代码预览
  if (name === 'justfile' || name === 'makefile') return CodeViewer;
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return MdViewer;
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return ImageViewer;
  if (['.sql', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.py', '.js', '.ts', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.cs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish', '.env', '.gitignore', '.dockerfile'].includes(ext)) return CodeViewer;
  return UnsupportedViewer;
}

export default function Workspace() {
  const [current, setCurrent] = useState<string | null>(() => viewState.get());
  const Viewer = current ? viewerFor(current) : null;

  useEffect(() => viewState.subscribe(setCurrent), []);

  return (
    <div className="mx-auto h-full max-w-5xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
      {current && Viewer ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <Viewer path={current} />
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
